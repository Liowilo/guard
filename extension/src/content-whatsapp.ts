// Guard · Spike WhatsApp Web
//
// Objetivo: validar que podemos detectar mensajes entrantes nuevos en
// web.whatsapp.com en tiempo real, sin que el menor pegue nada.
//
// Estrategia:
//   1. Esperar a que el DOM tenga #main (panel de la conversación activa).
//   2. MutationObserver sobre #main → al detectar nodos nuevos, buscar los
//      [role="row"] que contengan .message-in (entrantes) con .copyable-text
//      (mensajes de texto, no stickers / media puros).
//   3. Extraer: msgId (del [data-id]), remitente y timestamp (parseados del
//      data-pre-plain-text), y texto plano (span.selectable-text).
//   4. Dedupe por msgId. Solo logueamos los que aparecen DESPUÉS del momento
//      en que el observer empieza, porque al abrir un chat WhatsApp inserta
//      todo el historial visible de golpe.
//
// El contenido NUNCA sale del DOM en este spike. Solo console.log + badge.

type Capture = {
  msgId: string;
  text: string;
  sender: string | null;
  timestamp: string | null;
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
  el.style.background = "rgba(220, 38, 38, 0.95)"; // rojo
  el.textContent = "⚠ Guard · señal enviada al pacto";
  setTimeout(() => {
    el.style.background = prevBg;
    el.textContent = prevText;
    updateBadge();
  }, 2500);
}

// data-pre-plain-text viene como: "[HH:MM, dd/mm/yyyy] Nombre: "
// Lo parseamos best-effort; si falla, devolvemos null y seguimos.
function parsePrePlain(s: string | null): { sender: string | null; timestamp: string | null } {
  if (!s) return { sender: null, timestamp: null };
  const m = s.match(/^\[([^\]]+)\]\s*([^:]+):\s*$/);
  if (!m) return { sender: null, timestamp: null };
  return { timestamp: m[1].trim(), sender: m[2].trim() };
}

function extractMessage(row: Element): Capture | null {
  // Filtrar: solo entrantes con texto.
  const incoming = row.querySelector(".message-in");
  if (!incoming) return null;

  const copyable = incoming.querySelector<HTMLElement>(".copyable-text[data-pre-plain-text]");
  if (!copyable) return null; // sticker, media sin caption, etc.

  const idHolder = row.querySelector<HTMLElement>("[data-id]") ?? row.closest<HTMLElement>("[data-id]");
  const msgId = idHolder?.getAttribute("data-id") ?? "";
  if (!msgId) return null;

  const textNode = copyable.querySelector<HTMLElement>("span.selectable-text");
  const text = (textNode?.innerText ?? copyable.innerText ?? "").trim();
  if (!text) return null;

  const { sender, timestamp } = parsePrePlain(copyable.getAttribute("data-pre-plain-text"));

  return { msgId, text, sender, timestamp, receivedAt: Date.now() };
}

function processNode(node: Node) {
  if (!(node instanceof Element)) return;

  // El nodo puede ser una fila completa o un contenedor con varias filas.
  const rows: Element[] = node.matches?.('[role="row"]')
    ? [node]
    : Array.from(node.querySelectorAll('[role="row"]'));

  for (const row of rows) {
    const cap = extractMessage(row);
    if (!cap) continue;
    if (seen.has(cap.msgId)) continue;
    seen.add(cap.msgId);

    // Durante el warmup (apertura de chat) sembramos "seen" sin loguear,
    // para que al pegar todo el historial no escupa decenas de logs falsos.
    if (cap.receivedAt < warmupUntil) continue;

    detectedCount++;
    updateBadge();
    pulseBadge();

    // El texto se manda al service worker, que lo reenvía al offscreen
    // donde corre el modelo. NUNCA sale del dispositivo.
    chrome.runtime
      .sendMessage({
        type: "analyze",
        text: cap.text,
        msgId: cap.msgId,
        platform: "whatsapp_web",
      })
      .then((result) => {
        if (!result?.ok) {
          log("error en análisis:", result?.error ?? "sin respuesta");
          return;
        }
        const top = result.scores[0];
        const pct = Math.round(top.score * 100);
        log(`analizado [${top.label} ${pct}%]${result.sent ? " · señal enviada ✓" : ""}`, {
          sender: cap.sender,
          msgId: cap.msgId,
        });
        if (result.sent) flashAlert();
      })
      .catch((err) => log("error de mensajería:", err));
  }
}

let mainObserver: MutationObserver | null = null;
let currentMain: Element | null = null;

function attachToMain(main: Element) {
  if (currentMain === main && mainObserver) return;

  // Reset state al cambiar de conversación.
  if (mainObserver) mainObserver.disconnect();
  seen.clear();
  warmupUntil = Date.now() + 1500; // ignorar la avalancha inicial 1.5s
  currentMain = main;

  // Sembrar lo que ya está pintado para no loguearlo después.
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

  log("observando conversación activa", main);
}

// El #main aparece y desaparece según el usuario abra/cierre chats.
// Un observer de nivel root nos avisa cuando aparece uno nuevo.
function bootstrap() {
  log("spike cargado en", location.href);
  ensureBadge();

  // OJO: WhatsApp tiene un <mask id="main"> dentro de SVGs de íconos que
  // matchea antes que el panel real. Filtramos a div para evitarlo.
  const findMain = () => document.querySelector<HTMLDivElement>("div#main");

  const rootObserver = new MutationObserver(() => {
    const main = findMain();
    if (main && main !== currentMain) attachToMain(main);
  });
  rootObserver.observe(document.body, { childList: true, subtree: true });

  // Por si #main ya existía al cargar el script.
  const initial = findMain();
  if (initial) attachToMain(initial);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
