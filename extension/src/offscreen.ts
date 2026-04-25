// Guard · Offscreen document
//
// Hospeda el clasificador Guardia. Vive separado del service worker porque:
//   - El SW se duerme a los ~30s y perdería el modelo cargado.
//   - El popup se cierra al hacer click fuera y también perdería el modelo.
//   - Los content_scripts cargarían el modelo en cada pestaña (113 MB × N).
//
// Recibe mensajes { target: "offscreen", type: "analyze", text } desde el
// service worker y responde { ok, scores } con scores ordenados desc.

import { env, pipeline, PreTrainedTokenizer, TextClassificationPipeline } from "@huggingface/transformers";
import { DASHBOARD_URL } from "./config";

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = `${DASHBOARD_URL}/models/`;
// Deshabilitamos el Cache API: durante los intentos previos en path incorrecto
// se quedaron entradas corruptas que provocaban tokenizer=null silenciosamente.
// El modelo siempre se baja de localhost:3000 (rápido), no necesitamos cache.
env.useBrowserCache = false;

let classifier: TextClassificationPipeline | null = null;
let loadingPromise: Promise<TextClassificationPipeline> | null = null;

function configureWasm() {
  const wasmBase = chrome.runtime.getURL("wasm/");
  const ortWasm = (env.backends.onnx as any).wasm;
  ortWasm.numThreads = 1;
  // Asignación incondicional: nos aseguramos de que ORT use los WASM
  // empaquetados en la extensión, no el CDN (que el CSP bloquea).
  ortWasm.wasmPaths = {
    mjs: `${wasmBase}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${wasmBase}ort-wasm-simd-threaded.asyncify.wasm`,
  };
}

async function loadClassifier(): Promise<TextClassificationPipeline> {
  if (classifier) {
    console.log("[Guard offscreen] devolviendo classifier cacheado, tokenizer =", (classifier as any).tokenizer);
    return classifier;
  }
  if (loadingPromise) return loadingPromise;

  configureWasm();

  // Cargamos el tokenizer manualmente con fetch plano + construcción directa
  // de PreTrainedTokenizer. Saltamos AutoTokenizer porque con esta combinación
  // de versión (transformers.js 4.2) + config del modelo (model_type=bert,
  // tokenizer_class=PreTrainedTokenizerFast) el auto-detector falla antes
  // de fetchear los archivos.
  console.log("[Guard offscreen] cargando tokenizer manualmente con fetch…");
  const [tokenizerJSON, tokenizerConfig] = await Promise.all([
    fetch(`${DASHBOARD_URL}/models/guardia/tokenizer.json`).then((r) => {
      if (!r.ok) throw new Error(`tokenizer.json: HTTP ${r.status}`);
      return r.json();
    }),
    fetch(`${DASHBOARD_URL}/models/guardia/tokenizer_config.json`).then((r) => {
      if (!r.ok) throw new Error(`tokenizer_config.json: HTTP ${r.status}`);
      return r.json();
    }),
  ]);
  console.log("[Guard offscreen] tokenizer.json y tokenizer_config.json descargados");
  const tokenizer = new PreTrainedTokenizer(tokenizerJSON, tokenizerConfig);
  console.log("[Guard offscreen] tokenizer construido:", tokenizer, "callable?", typeof tokenizer === "function");

  const attempt = pipeline("text-classification", "guardia", {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p: { status: string; progress?: number }) => {
      if (p.status === "progress" && p.progress !== undefined) {
        console.log(`[Guard offscreen] cargando modelo… ${Math.round(p.progress)}%`);
      } else if (p.status === "done") {
        console.log("[Guard offscreen] modelo listo");
      }
    },
  }) as Promise<TextClassificationPipeline>;
  loadingPromise = attempt;

  try {
    classifier = await attempt;
    console.log("[Guard offscreen] tokenizer DENTRO del classifier (antes del fix):", (classifier as any).tokenizer);

    // Forzamos siempre la asignación, no dependemos del if.
    (classifier as any).tokenizer = tokenizer;
    console.log("[Guard offscreen] tokenizer DESPUÉS del fix:", (classifier as any).tokenizer, "callable?", typeof (classifier as any).tokenizer === "function");

    return classifier;
  } catch (err) {
    if (loadingPromise === attempt) loadingPromise = null;
    throw err;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return false;
  if (msg?.type !== "analyze") return false;

  (async () => {
    try {
      const clf = await loadClassifier();
      console.log("[Guard offscreen] clf =", clf, "tokenizer =", (clf as any).tokenizer, "type =", typeof (clf as any).tokenizer);
      const raw = await clf(msg.text, { top_k: null });
      const flat = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw;
      const scores = (flat as Array<{ label: string; score: number }>)
        .slice()
        .sort((a, b) => b.score - a.score);
      sendResponse({ ok: true, scores });
    } catch (err) {
      console.error("[Guard offscreen] inferencia falló:", err);
      sendResponse({ ok: false, error: (err as Error).message });
    }
  })();
  return true; // respuesta async
});

// Pre-cargar de inmediato. Si falla (ej. dashboard apagado), reintenta
// silenciosamente en la siguiente inferencia.
loadClassifier().catch((err) => {
  console.warn("[Guard offscreen] pre-carga falló (se reintentará al primer mensaje):", err);
  loadingPromise = null;
});
