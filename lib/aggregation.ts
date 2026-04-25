import type { Signal, SignalLabel, RiskLevel } from "@/lib/database.types";

export const LABEL_INFO: Record<SignalLabel, { name: string; desc: string }> = {
  love_bombing: {
    name: "Love bombing",
    desc: "Halagos excesivos / afecto desproporcionado al tiempo de la relación.",
  },
  intimacy_escalation: {
    name: "Escalamiento de intimidad",
    desc: "Empuje a temas íntimos o sexuales.",
  },
  emotional_isolation: {
    name: "Aislamiento emocional",
    desc: "Aislar de familia y amigos.",
  },
  deceptive_offer: {
    name: "Oferta engañosa",
    desc: "Regalos, dinero, oportunidades demasiado buenas.",
  },
  off_platform_request: {
    name: "Salir de la plataforma",
    desc: "Pedir mover la conversación a otro canal privado.",
  },
};

export const RISK_RANK: Record<RiskLevel, number> = {
  bajo: 1,
  medio: 2,
  alto: 3,
};

export const RISK_STYLE: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  bajo: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  medio: {
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-900",
  },
  alto: {
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-200 dark:border-red-900",
  },
};

export function aggregateRisk(signals: Signal[]): RiskLevel {
  if (!signals.length) return "bajo";
  const max = signals.reduce(
    (acc, s) => Math.max(acc, RISK_RANK[s.risk_level]),
    0,
  );
  if (max >= 3) return "alto";
  if (max >= 2) return "medio";
  return "bajo";
}

export function countByLabel(signals: Signal[]): Array<{ label: SignalLabel; count: number }> {
  const counts = new Map<SignalLabel, number>();
  for (const s of signals) counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function countByPlatform(signals: Signal[]): Array<{ platform: string; count: number }> {
  const counts = new Map<string, number>();
  for (const s of signals) {
    const k = s.platform ?? "desconocido";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);
}

export function countByDay(
  signals: Signal[],
  days: number,
): Array<{ day: string; count: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Array<{ day: string; date: Date; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ day: d.toISOString().slice(0, 10), date: d, count: 0 });
  }
  for (const s of signals) {
    const d = new Date(s.detected_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const bucket = buckets.find((b) => b.day === key);
    if (bucket) bucket.count++;
  }
  return buckets.map(({ day, count }) => ({ day, count }));
}

const COFIRE_HIGH_RISK_PAIRS: Array<[SignalLabel, SignalLabel]> = [
  ["love_bombing", "emotional_isolation"],
  ["intimacy_escalation", "off_platform_request"],
  ["deceptive_offer", "off_platform_request"],
  ["emotional_isolation", "intimacy_escalation"],
];

/**
 * Patterns where multiple labels co-fire within a short window — a stronger
 * signal than any single label in isolation.
 */
export function detectCoFiringPatterns(signals: Signal[], windowMinutes = 30) {
  const sorted = [...signals].sort(
    (a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime(),
  );
  const found: Array<{ at: string; pair: [SignalLabel, SignalLabel] }> = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const dt =
        (new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()) /
        60000;
      if (dt > windowMinutes) break;
      if (a.label === b.label) continue;
      const pair = COFIRE_HIGH_RISK_PAIRS.find(
        (p) =>
          (p[0] === a.label && p[1] === b.label) ||
          (p[0] === b.label && p[1] === a.label),
      );
      if (pair) found.push({ at: a.detected_at, pair });
    }
  }
  return found;
}
