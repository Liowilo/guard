"use client";

import { useEffect, useRef, useState } from "react";

type LabelInfo = { id: string; name: string; desc: string };

const LABELS: LabelInfo[] = [
  { id: "love_bombing", name: "Love bombing", desc: "Halagos excesivos / afecto desproporcionado" },
  { id: "intimacy_escalation", name: "Escalamiento de intimidad", desc: "Empuje a temas íntimos o sexuales" },
  { id: "emotional_isolation", name: "Aislamiento emocional", desc: "Aislar de familia y amigos" },
  { id: "deceptive_offer", name: "Oferta engañosa", desc: "Regalos / dinero / oportunidades" },
  { id: "off_platform_request", name: "Salir de la plataforma", desc: "Mover la conversación a otro canal" },
];

type Score = { label: string; score: number };
type LoadStatus =
  | { kind: "idle" }
  | { kind: "loading"; progress: number; file?: string }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export default function Classifier({ samples }: { samples: string[] }) {
  const [status, setStatus] = useState<LoadStatus>({ kind: "idle" });
  const [text, setText] = useState("");
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const pipelineRef = useRef<((input: string, opts?: unknown) => Promise<Score[]>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "loading", progress: 0 });
    (async () => {
      try {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowRemoteModels = true;
        env.allowLocalModels = false;

        const clf = await pipeline("text-classification", "Liowilo/guardia", {
          dtype: "q8",
          progress_callback: (p: { status: string; progress?: number; file?: string }) => {
            if (cancelled) return;
            if (p.status === "progress" && typeof p.progress === "number") {
              setStatus({ kind: "loading", progress: p.progress, file: p.file });
            }
          },
        });
        if (cancelled) return;
        pipelineRef.current = clf as unknown as (
          input: string,
          opts?: unknown,
        ) => Promise<Score[]>;
        setStatus({ kind: "ready" });
      } catch (err) {
        if (cancelled) return;
        setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    const clf = pipelineRef.current;
    if (!clf || !text.trim() || running) return;
    setRunning(true);
    const t0 = performance.now();
    try {
      const result = await clf(text, { top_k: null });
      const map: Record<string, number> = {};
      for (const r of result) map[r.label] = r.score;
      setScores(map);
      setLatency(performance.now() - t0);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setRunning(false);
    }
  }

  const ready = status.kind === "ready";

  return (
    <div className="space-y-6">
      <StatusBanner status={status} />

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="msg" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Mensaje a analizar
        </label>
        <textarea
          id="msg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Pega o escribe un mensaje en español..."
          className="mt-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={run}
            disabled={!ready || running || !text.trim()}
            className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {running ? "Analizando..." : "Clasificar"}
          </button>
          <button
            onClick={() => {
              setText("");
              setScores(null);
              setLatency(null);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Limpiar
          </button>
          {latency != null && (
            <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {latency.toFixed(0)} ms
            </span>
          )}
        </div>
      </div>

      <Samples samples={samples} disabled={!ready} onPick={(s) => setText(s)} />

      <Results scores={scores} />
    </div>
  );
}

function StatusBanner({ status }: { status: LoadStatus }) {
  if (status.kind === "ready") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Modelo cargado. La inferencia ahora corre 100% en este navegador.
      </div>
    );
  }
  if (status.kind === "error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Error: {status.message}
      </div>
    );
  }
  if (status.kind === "loading") {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <div className="flex items-center justify-between">
          <span>
            Descargando modelo {status.file ? <code className="text-xs">{status.file}</code> : null}
          </span>
          <span className="font-mono text-xs">{Math.round(status.progress)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 transition-all dark:bg-zinc-100"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>
    );
  }
  return null;
}

function Samples({
  samples,
  disabled,
  onPick,
}: {
  samples: string[];
  disabled: boolean;
  onPick: (s: string) => void;
}) {
  return (
    <details className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Ejemplos de prueba
      </summary>
      <ul className="mt-3 space-y-2">
        {samples.map((s, i) => (
          <li key={i}>
            <button
              onClick={() => onPick(s)}
              disabled={disabled}
              className="block w-full rounded-md bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Results({ scores }: { scores: Record<string, number> | null }) {
  if (!scores) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Probabilidades por etiqueta
      </h2>
      <ul className="space-y-3">
        {LABELS.map((l) => {
          const s = scores[l.id] ?? 0;
          const pct = Math.round(s * 100);
          const high = s >= 0.5;
          return (
            <li key={l.id}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {l.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{l.desc}</div>
                </div>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    high ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {pct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full transition-all ${high ? "bg-red-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
