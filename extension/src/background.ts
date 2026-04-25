// Guard · Service Worker (MV3)
//
// Responsabilidades:
//   1. Levantar/mantener el offscreen document que hospeda el modelo.
//   2. Rutear mensajes content_script → offscreen → POST /api/signals.
//   3. Sostener el JWT del menor (chrome.storage.local) para enviar señales.
//
// Importante: el SW se duerme a los ~30s sin actividad y se despierta con
// cada mensaje. Toda la inferencia vive en el offscreen para no recargar
// el modelo cada vez. Los listeners se registran top-level → sobreviven
// al ciclo de vida del SW.

import { DASHBOARD_URL } from "./config";

const OFFSCREEN_PATH = "offscreen.html";

type AnalyzeRequest = {
  type: "analyze";
  text: string;
  msgId: string;
  platform: string;
};

type Score = { label: string; score: number };

type AnalyzeResponse =
  | { ok: true; scores: Score[]; sent: boolean }
  | { ok: false; error: string };

const SIGNAL_THRESHOLD = 0.45;

async function ensureOffscreen() {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  // @ts-expect-error — getContexts es API estable pero los typings de
  // @types/chrome aún la marcan como experimental.
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [url],
  });
  if (Array.isArray(existing) && existing.length > 0) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Inferencia on-device del clasificador Guardia (XLM-R Q8).",
  });
}

async function classify(text: string): Promise<Score[]> {
  await ensureOffscreen();
  const result = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "analyze",
    text,
  });
  if (!result?.ok) throw new Error(result?.error ?? "offscreen sin respuesta");
  return result.scores as Score[];
}

async function sendSignal(label: string, score: number, platform: string) {
  const { access_token } = await chrome.storage.local.get("access_token");
  if (!access_token) {
    console.warn("[Guard SW] señal no enviada: el menor no ha iniciado sesión en el popup");
    return false;
  }
  const res = await fetch(`${DASHBOARD_URL}/api/signals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label, score, platform }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.warn("[Guard SW] /api/signals respondió", res.status, body);
    return false;
  }
  return true;
}

async function handleAnalyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const scores = await classify(req.text);
    const top = scores[0];
    const sent = top && top.score >= SIGNAL_THRESHOLD
      ? await sendSignal(top.label, top.score, req.platform)
      : false;
    return { ok: true, scores, sent };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Mensajes con target === "offscreen" son para el offscreen, no nosotros.
  if (msg?.target === "offscreen") return false;

  if (msg?.type === "analyze") {
    handleAnalyze(msg as AnalyzeRequest).then(sendResponse);
    return true; // respuesta async
  }
  return false;
});

// Pre-warm el offscreen al instalar/arrancar para que el primer mensaje no
// pague el costo de spawnear el documento.
chrome.runtime.onInstalled.addListener(() => {
  ensureOffscreen().catch((err) => console.error("[Guard SW] ensureOffscreen", err));
});
chrome.runtime.onStartup.addListener(() => {
  ensureOffscreen().catch((err) => console.error("[Guard SW] ensureOffscreen", err));
});
