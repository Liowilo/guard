"use strict";
(() => {
  // extension/src/content-whatsapp.ts
  var seen = /* @__PURE__ */ new Set();
  var warmupUntil = 0;
  var badge = null;
  var detectedCount = 0;
  function log(...args) {
    console.log("%c[Guard]", "color:#7c3aed;font-weight:bold", ...args);
  }
  function ensureBadge() {
    if (badge) return badge;
    const el = document.createElement("div");
    el.id = "guard-badge";
    Object.assign(el.style, {
      position: "fixed",
      top: "12px",
      right: "12px",
      zIndex: "999999",
      background: "rgba(124, 58, 237, 0.95)",
      color: "white",
      padding: "6px 10px",
      borderRadius: "8px",
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      fontWeight: "600",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      pointerEvents: "none",
      transition: "opacity 0.2s"
    });
    el.textContent = "Guard activo \xB7 0 mensajes";
    document.body.appendChild(el);
    badge = el;
    return el;
  }
  function updateBadge() {
    ensureBadge().textContent = `Guard activo \xB7 ${detectedCount} mensajes`;
  }
  function pulseBadge() {
    const el = ensureBadge();
    el.style.opacity = "0.4";
    setTimeout(() => {
      el.style.opacity = "1";
    }, 120);
  }
  function flashAlert() {
    const el = ensureBadge();
    const prevBg = el.style.background;
    const prevText = el.textContent;
    el.style.background = "rgba(220, 38, 38, 0.95)";
    el.textContent = "\u26A0 Guard \xB7 se\xF1al enviada al pacto";
    setTimeout(() => {
      el.style.background = prevBg;
      el.textContent = prevText;
      updateBadge();
    }, 2500);
  }
  function parsePrePlain(s) {
    if (!s) return { sender: null, timestamp: null };
    const m = s.match(/^\[([^\]]+)\]\s*([^:]+):\s*$/);
    if (!m) return { sender: null, timestamp: null };
    return { timestamp: m[1].trim(), sender: m[2].trim() };
  }
  function extractMessage(row) {
    const incoming = row.querySelector(".message-in");
    if (!incoming) return null;
    const copyable = incoming.querySelector(".copyable-text[data-pre-plain-text]");
    if (!copyable) return null;
    const idHolder = row.querySelector("[data-id]") ?? row.closest("[data-id]");
    const msgId = idHolder?.getAttribute("data-id") ?? "";
    if (!msgId) return null;
    const textNode = copyable.querySelector("span.selectable-text");
    const text = (textNode?.innerText ?? copyable.innerText ?? "").trim();
    if (!text) return null;
    const { sender, timestamp } = parsePrePlain(copyable.getAttribute("data-pre-plain-text"));
    return { msgId, text, sender, timestamp, receivedAt: Date.now() };
  }
  function processNode(node) {
    if (!(node instanceof Element)) return;
    const rows = node.matches?.('[role="row"]') ? [node] : Array.from(node.querySelectorAll('[role="row"]'));
    for (const row of rows) {
      const cap = extractMessage(row);
      if (!cap) continue;
      if (seen.has(cap.msgId)) continue;
      seen.add(cap.msgId);
      if (cap.receivedAt < warmupUntil) continue;
      detectedCount++;
      updateBadge();
      pulseBadge();
      chrome.runtime.sendMessage({
        type: "analyze",
        text: cap.text,
        msgId: cap.msgId,
        platform: "whatsapp_web"
      }).then((result) => {
        if (!result?.ok) {
          log("error en an\xE1lisis:", result?.error ?? "sin respuesta");
          return;
        }
        const top = result.scores[0];
        const pct = Math.round(top.score * 100);
        log(`analizado [${top.label} ${pct}%]${result.sent ? " \xB7 se\xF1al enviada \u2713" : ""}`, {
          sender: cap.sender,
          msgId: cap.msgId
        });
        if (result.sent) flashAlert();
      }).catch((err) => log("error de mensajer\xEDa:", err));
    }
  }
  var mainObserver = null;
  var currentMain = null;
  function attachToMain(main) {
    if (currentMain === main && mainObserver) return;
    if (mainObserver) mainObserver.disconnect();
    seen.clear();
    warmupUntil = Date.now() + 1500;
    currentMain = main;
    for (const row of main.querySelectorAll('[role="row"]')) {
      const cap = extractMessage(row);
      if (cap) seen.add(cap.msgId);
    }
    mainObserver = new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach(processNode);
      }
    });
    mainObserver.observe(main, { childList: true, subtree: true });
    log("observando conversaci\xF3n activa", main);
  }
  function bootstrap() {
    log("spike cargado en", location.href);
    ensureBadge();
    const findMain = () => document.querySelector("div#main");
    const rootObserver = new MutationObserver(() => {
      const main = findMain();
      if (main && main !== currentMain) attachToMain(main);
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
    const initial = findMain();
    if (initial) attachToMain(initial);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
