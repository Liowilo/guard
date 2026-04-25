import { createClient } from "@supabase/supabase-js";
import { env, pipeline, TextClassificationPipeline } from "@huggingface/transformers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, DASHBOARD_URL } from "./config";

// En entornos browser, allowLocalModels=false por defecto.
// Lo habilitamos y apuntamos al servidor local para cargar el modelo.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = `${DASHBOARD_URL}/models/`;

// ---------------------------------------------------------------------------
// Supabase client — usa anon key + JWT del menor para RLS
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Estado global del popup
// ---------------------------------------------------------------------------
let accessToken: string | null = null;
let classifier: TextClassificationPipeline | null = null;

const LABELS: Record<string, string> = {
  love_bombing: "Love bombing",
  intimacy_escalation: "Escalamiento de intimidad",
  emotional_isolation: "Aislamiento emocional",
  deceptive_offer: "Oferta engañosa",
  off_platform_request: "Salir de la plataforma",
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function $(id: string) { return document.getElementById(id)!; }
function show(id: string) { ($(id) as HTMLElement).style.display = ""; }
function hide(id: string) { ($(id) as HTMLElement).style.display = "none"; }
function setText(id: string, text: string) { $(id).textContent = text; }
function setError(id: string, msg: string) { setText(id, msg); show(id); }
function clearError(id: string) { hide(id); }

function setRiskTag(risk: string) {
  const el = $("risk-tag");
  el.textContent = risk.charAt(0).toUpperCase() + risk.slice(1);
  el.className = `tag tag-${risk}`;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
async function loadSession() {
  const stored = await chrome.storage.local.get(["access_token", "display_name"]);
  if (stored.access_token) {
    accessToken = stored.access_token;
    showApp(stored.display_name ?? "Menor");
  } else {
    showLogin();
  }
}

function showLogin() {
  hide("view-app");
  show("view-login");
}

function showApp(name: string) {
  hide("view-login");
  show("view-app");
  setText("user-name", name);
  hide("results");
  hide("model-loading");
  clearError("app-error");
}

async function login() {
  clearError("login-error");
  const email = ($("email") as HTMLInputElement).value.trim();
  const password = ($("password") as HTMLInputElement).value;
  if (!email || !password) return setError("login-error", "Completa todos los campos");

  const btn = $("btn-login") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Entrando…";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = "Iniciar sesión";

  if (error || !data.session) {
    return setError("login-error", error?.message ?? "Error al iniciar sesión");
  }

  // Verificar que sea menor con pacto firmado
  const jwt = data.session.access_token;
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: profile } = await userSupabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== "menor") {
    await supabase.auth.signOut();
    return setError("login-error", "Solo menores pueden usar la extensión");
  }

  const { data: pact } = await userSupabase
    .from("pacts")
    .select("id")
    .eq("menor_id", data.user.id)
    .eq("status", "signed")
    .single();

  if (!pact) {
    await supabase.auth.signOut();
    return setError("login-error", "No tienes un pacto firmado. Pide a tu tutor que lo active.");
  }

  await chrome.storage.local.set({
    access_token: jwt,
    display_name: profile.display_name,
  });
  accessToken = jwt;
  showApp(profile.display_name);
}

async function logout() {
  await chrome.storage.local.remove(["access_token", "display_name"]);
  accessToken = null;
  classifier = null;
  showLogin();
}

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------
async function loadModel(): Promise<TextClassificationPipeline> {
  if (classifier) return classifier;

  show("model-loading");
  setText("model-progress", "iniciando…");

  // Apuntar ORT a los archivos WASM locales de la extensión.
  // Debe hacerse justo antes de pipeline() y mutando el objeto existente
  // (no reemplazándolo) para que la referencia interna de ORT siga siendo válida.
  const wasmBase = chrome.runtime.getURL("wasm/");
  const ortWasm = (env.backends.onnx as any).wasm;
  ortWasm.numThreads = 1;
  // El build script ya parchó el CDN URL en el bundle → ./wasm/
  // Esto asegura que si el parche falla, el path local también esté aquí.
  if (!ortWasm.wasmPaths) {
    ortWasm.wasmPaths = {
      mjs: `${wasmBase}ort-wasm-simd-threaded.asyncify.mjs`,
      wasm: `${wasmBase}ort-wasm-simd-threaded.asyncify.wasm`,
    };
  }

  classifier = await pipeline("text-classification", "guardia", {
    dtype: "q8",
    device: "wasm",
    progress_callback: (progress: { status: string; progress?: number }) => {
      if (progress.status === "progress" && progress.progress !== undefined) {
        setText("model-progress", `${Math.round(progress.progress)}%`);
      } else if (progress.status === "done") {
        setText("model-progress", "listo");
      }
    },
  }) as TextClassificationPipeline;

  hide("model-loading");
  return classifier;
}

async function analyze() {
  const text = ($("message") as HTMLTextAreaElement).value.trim();
  if (!text) return;

  clearError("app-error");
  hide("results");
  hide("signal-sent");

  const btn = $("btn-analyze") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Analizando…";

  try {
    const clf = await loadModel();
    const raw = await clf(text, { top_k: null });
    const flat = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw;
    const scores = (flat as Array<{ label: string; score: number }>);

    renderResults(scores);
  } catch (e) {
    setError("app-error", `Error: ${(e as Error).message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Analizar (on-device)";
  }
}

function scoreToRisk(score: number) {
  if (score >= 0.7) return "alto";
  if (score >= 0.45) return "medio";
  return "bajo";
}

function renderResults(scores: Array<{ label: string; score: number }>) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const risk = scoreToRisk(topScore);

  show("results");
  setRiskTag(risk);

  const container = $("result-bars");
  container.innerHTML = "";

  for (const s of sorted) {
    const pct = Math.round(s.score * 100);
    const riskClass = scoreToRisk(s.score) === "alto" ? "bar-alto" : scoreToRisk(s.score) === "medio" ? "bar-medio" : "";
    container.innerHTML += `
      <div class="result-item">
        <div class="result-label">
          <span>${LABELS[s.label] ?? s.label}</span>
          <span>${pct}%</span>
        </div>
        <div class="bar-wrap"><div class="bar ${riskClass}" style="width:${pct}%"></div></div>
      </div>`;
  }

  hide("signal-sent");
  const sendBtn = $("btn-send") as HTMLButtonElement;

  if (topScore >= 0.45) {
    sendBtn.style.display = "";
    sendBtn.disabled = false;
    sendBtn.textContent = "Enviar señal al dashboard";
    sendBtn.onclick = () => sendSignal(sorted[0].label, sorted[0].score);
  } else {
    hide("btn-send");
  }
}

async function sendSignal(label: string, score: number) {
  if (!accessToken) return;

  const btn = $("btn-send") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Enviando…";

  try {
    const res = await fetch(`${DASHBOARD_URL}/api/signals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label, score, platform: "extensión" }),
    });

    if (res.ok) {
      hide("btn-send");
      show("signal-sent");
    } else {
      const body = await res.json().catch(() => ({}));
      setError("app-error", body.error ?? `Error ${res.status}`);
      btn.disabled = false;
      btn.textContent = "Enviar señal al dashboard";
    }
  } catch (e) {
    setError("app-error", `Error de red: ${(e as Error).message}`);
    btn.disabled = false;
    btn.textContent = "Enviar señal al dashboard";
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadSession();
  $("btn-login").addEventListener("click", login);
  $("btn-logout").addEventListener("click", logout);
  $("btn-analyze").addEventListener("click", analyze);
  $("password").addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") login();
  });
});
