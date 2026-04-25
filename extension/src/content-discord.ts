// Guard · Discord Web
//
// Estrategia:
//   1. Esperar al ol[data-list-id="chat-messages"] (lista de mensajes activa).
//   2. MutationObserver sobre ese ol → al detectar li[id^="chat-messages-"]
//      nuevos, extraer el texto del [class*="messageContent"] y el autor del
//      [class*="username"] en el header del grupo.
//   3. Discord usa class names hasheados/minificados; usamos [class*="..."] para
//      ser resilientes a deploys. Los IDs de mensaje son estables.
//   4. Dedupe por id del li. Warmup 1500ms igual que WhatsApp para saltar el
//      historial visible al abrir el canal.
//
// El contenido NUNCA sale del dispositivo. Solo etiquetas+scores al dashboard.

type Capture = {
  msgId: string;
  text: string;
  author: string | null;
  receivedAt: number;
};

const seen = new Set<string>();
let warmupUntil = 0;
let badge: HTMLElement | null = null;
let detectedCount = 0;

function log(...args: unknown[]) {
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
    transition: "opacity 0.2s",
  } as Partial<CSSStyleDeclaration>);
  el.textContent = "Guard activo · 0 mensajes";
  document.body.appendChild(el);
  badge = el;
  return el;
}

function updateBadge() {
  ensureBadge().textContent = `Guard activo · ${detectedCount} mensajes`;
}

function pulseBadge() {
  const el = ensureBadge();
  el.style.opacity = "0.4";
  setTimeout(() => { el.style.opacity = "1"; }, 120);
}

function flashAlert() {
  const el = ensureBadge();
  const prevBg = el.style.background;
  const prevText = el.textContent;
  el.style.background = "rgba(220, 38, 38, 0.95)";
  el.textContent = "⚠ Guard · señal enviada al pacto";
  setTimeout(() => {
    el.style.background = prevBg;
    el.textContent = prevText;
    updateBadge();
  }, 2500);
}

function extractMessage(li: Element): Capture | null {
  // Discord pone el id del mensaje como atributo id y data-list-item-id.
  const msgId = li.getAttribute("data-list-item-id") ?? li.id ?? "";
  if (!msgId) return null;

  // El contenido del mensaje está en el primer [class*="messageContent"].
  // Evitamos coger el repliedTextContent (preview de reply) buscando el
  // inmediato dentro del li, no dentro de un [class*="replyBar"].
  const replyBar = li.querySelector('[class*="replyBar"],[class*="repliedMessage"]');
  const contentEl = li.querySelector<HTMLElement>('[class*="messageContent"]');
  if (!contentEl) return null;

  // Si el contentEl está dentro del replyBar, ignorar — hay otro más abajo.
  let realContent: HTMLElement | null = contentEl;
  if (replyBar && replyBar.contains(contentEl)) {
    // Buscar el siguiente messageContent fuera del replyBar.
    const all = Array.from(li.querySelectorAll<HTMLElement>('[class*="messageContent"]'));
    realContent = all.find((el) => !replyBar.contains(el)) ?? null;
  }
  if (!realContent) return null;

  const text = realContent.innerText?.trim() ?? "";
  if (!text) return null;

  // Autor: aparece en el header del primer mensaje de cada grupo.
  const authorEl = li.querySelector<HTMLElement>('[class*="username"]');
  const author = authorEl?.textContent?.trim() ?? null;

  return { msgId, text, author, receivedAt: Date.now() };
}

function processNode(node: Node) {
  if (!(node instanceof Element)) return;

  const items: Element[] = node.matches?.('li[id^="chat-messages-"]')
    ? [node]
    : Array.from(node.querySelectorAll('li[id^="chat-messages-"]'));

  for (const item of items) {
    const cap = extractMessage(item);
    if (!cap) continue;
    if (seen.has(cap.msgId)) continue;
    seen.add(cap.msgId);

    if (cap.receivedAt < warmupUntil) continue;

    detectedCount++;
    updateBadge();
    pulseBadge();

    chrome.runtime
      .sendMessage({
        type: "analyze",
        text: cap.text,
        msgId: cap.msgId,
        platform: "discord_web",
      })
      .then((result) => {
        if (!result?.ok) {
          log("error en análisis:", result?.error ?? "sin respuesta");
          return;
        }
        const top = result.scores[0];
        const pct = Math.round(top.score * 100);
        log(
          `analizado [${top.label} ${pct}%]${result.sent ? " · señal enviada ✓" : ""}`,
          { author: cap.author, msgId: cap.msgId }
        );
        if (result.sent) flashAlert();
      })
      .catch((err) => log("error de mensajería:", err));
  }
}

let chatObserver: MutationObserver | null = null;
let currentChat: Element | null = null;

function attachToChat(chat: Element) {
  if (currentChat === chat && chatObserver) return;

  if (chatObserver) chatObserver.disconnect();
  seen.clear();
  warmupUntil = Date.now() + 1500;
  currentChat = chat;

  // Sembrar historial visible para no repetirlo como "nuevos".
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

  // Discord reemplaza el ol al cambiar de canal — un observer de root lo detecta.
  const findChat = () =>
    document.querySelector<HTMLOListElement>('ol[data-list-id="chat-messages"]');

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
