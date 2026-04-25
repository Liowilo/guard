"use strict";
(() => {
  // extension/src/content-discord.ts
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
  function extractMessage(li) {
    const msgId = li.getAttribute("data-list-item-id") ?? li.id ?? "";
    if (!msgId) return null;
    const replyBar = li.querySelector('[class*="replyBar"],[class*="repliedMessage"]');
    const contentEl = li.querySelector('[class*="messageContent"]');
    if (!contentEl) return null;
    let realContent = contentEl;
    if (replyBar && replyBar.contains(contentEl)) {
      const all = Array.from(li.querySelectorAll('[class*="messageContent"]'));
      realContent = all.find((el) => !replyBar.contains(el)) ?? null;
    }
    if (!realContent) return null;
    const text = realContent.innerText?.trim() ?? "";
    if (!text) return null;
    const authorEl = li.querySelector('[class*="username"]');
    const author = authorEl?.textContent?.trim() ?? null;
    return { msgId, text, author, receivedAt: Date.now() };
  }
  function processNode(node) {
    if (!(node instanceof Element)) return;
    const items = node.matches?.('li[id^="chat-messages-"]') ? [node] : Array.from(node.querySelectorAll('li[id^="chat-messages-"]'));
    for (const item of items) {
      const cap = extractMessage(item);
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
        platform: "discord_web"
      }).then((result) => {
        if (!result?.ok) {
          log("error en an\xE1lisis:", result?.error ?? "sin respuesta");
          return;
        }
        const top = result.scores[0];
        const pct = Math.round(top.score * 100);
        log(
          `analizado [${top.label} ${pct}%]${result.sent ? " \xB7 se\xF1al enviada \u2713" : ""}`,
          { author: cap.author, msgId: cap.msgId }
        );
        if (result.sent) flashAlert();
      }).catch((err) => log("error de mensajer\xEDa:", err));
    }
  }
  var chatObserver = null;
  var currentChat = null;
  function attachToChat(chat) {
    if (currentChat === chat && chatObserver) return;
    if (chatObserver) chatObserver.disconnect();
    seen.clear();
    warmupUntil = Date.now() + 1500;
    currentChat = chat;
    for (const item of chat.querySelectorAll('li[id^="chat-messages-"]')) {
      const cap = extractMessage(item);
      if (cap) seen.add(cap.msgId);
    }
    chatObserver = new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach(processNode);
      }
    });
    chatObserver.observe(chat, { childList: true, subtree: true });
    log("observando canal de Discord", chat);
  }
  function bootstrap() {
    log("cargado en", location.href);
    ensureBadge();
    const findChat = () => document.querySelector('ol[data-list-id="chat-messages"]');
    const rootObserver = new MutationObserver(() => {
      const chat = findChat();
      if (chat && chat !== currentChat) attachToChat(chat);
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
    const initial = findChat();
    if (initial) attachToChat(initial);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
