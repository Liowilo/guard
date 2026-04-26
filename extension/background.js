"use strict";
(() => {
  // extension/src/config.ts
  var DASHBOARD_URL = "http://localhost:3000";

  // extension/src/background.ts
  var OFFSCREEN_PATH = "offscreen.html";
  var SIGNAL_THRESHOLD = 0.45;
  async function ensureOffscreen() {
    const url = chrome.runtime.getURL(OFFSCREEN_PATH);
    const existing = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [url]
    });
    if (Array.isArray(existing) && existing.length > 0) return;
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Inferencia on-device del clasificador Guardia (XLM-R Q8)."
    });
  }
  async function classify(text) {
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "analyze",
      text
    });
    if (!result?.ok) throw new Error(result?.error ?? "offscreen sin respuesta");
    return result.scores;
  }
  async function sendSignal(label, score, platform) {
    const { access_token } = await chrome.storage.local.get("access_token");
    if (!access_token) {
      console.warn("[Guard SW] se\xF1al no enviada: el menor no ha iniciado sesi\xF3n en el popup");
      return false;
    }
    const res = await fetch(`${DASHBOARD_URL}/api/signals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ label, score, platform })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("[Guard SW] /api/signals respondi\xF3", res.status, body);
      return false;
    }
    return true;
  }
  async function handleAnalyze(req) {
    try {
      const scores = await classify(req.text);
      const top = scores[0];
      const sent = top && top.score >= SIGNAL_THRESHOLD ? await sendSignal(top.label, top.score, req.platform) : false;
      return { ok: true, scores, sent };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.target === "offscreen") return false;
    if (msg?.type === "analyze") {
      handleAnalyze(msg).then(sendResponse);
      return true;
    }
    return false;
  });
  chrome.runtime.onInstalled.addListener(() => {
    ensureOffscreen().catch((err) => console.error("[Guard SW] ensureOffscreen", err));
  });
  chrome.runtime.onStartup.addListener(() => {
    ensureOffscreen().catch((err) => console.error("[Guard SW] ensureOffscreen", err));
  });
  var guardWindowId = null;
  chrome.action.onClicked.addListener(async () => {
    if (guardWindowId !== null) {
      try {
        await chrome.windows.update(guardWindowId, { focused: true });
        return;
      } catch {
        guardWindowId = null;
      }
    }
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 580,
      focused: true
    });
    guardWindowId = win.id ?? null;
  });
  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === guardWindowId) guardWindowId = null;
  });
})();
