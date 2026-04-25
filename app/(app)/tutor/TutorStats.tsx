"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/lib/database.types";
import {
  aggregateRisk,
  countByLabel,
  countByPlatform,
  countByDay,
  detectCoFiringPatterns,
  LABEL_INFO,
  RISK_STYLE,
} from "@/lib/aggregation";

const DAYS = 14;

interface Props {
  pactId: string;
  initialSignals: Signal[];
}

export default function TutorStats({ pactId, initialSignals }: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const supabase = useRef(createClient());

  useEffect(() => {
    const channel = supabase.current
      .channel(`tutor-stats-${pactId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals", filter: `pact_id=eq.${pactId}` },
        (payload) => {
          const s = payload.new as Signal;
          setSignals((prev) => [s, ...prev]);
          setNewIds((prev) => new Set(prev).add(s.id));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(s.id);
              return next;
            });
          }, 2500);
        }
      )
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [pactId]);

  const overallRisk = aggregateRisk(signals);
  const byLabel = countByLabel(signals);
  const byPlatform = countByPlatform(signals);
  const byDay = countByDay(signals, DAYS);
  const coFiring = detectCoFiringPatterns(signals);
  const riskStyle = RISK_STYLE[overallRisk];
  const highRisk = signals.filter((s) => s.risk_level === "alto");

  const platformLabel = (p: string | null) =>
    p ? p.replace("_web", "").replace("_", " ") : "desconocido";

  return (
    <>
      {/* Risk badge — se actualiza con cada señal */}
      <div className={`rounded-lg border px-4 py-2 text-center transition-colors ${riskStyle.bg} ${riskStyle.border}`}>
        <div className={`text-xs font-medium uppercase tracking-wide ${riskStyle.text}`}>
          Riesgo global
        </div>
        <div className={`text-xl font-bold capitalize ${riskStyle.text}`}>
          {overallRisk}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Señales totales" value={signals.length} />
        <Stat label="Alto riesgo" value={highRisk.length} alert={highRisk.length > 0} />
        <Stat label="Plataformas" value={byPlatform.length} />
        <Stat label="Co-disparos" value={coFiring.length} alert={coFiring.length > 0} />
      </div>

      {/* Co-firing alert */}
      {coFiring.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            Patrones combinados detectados
          </p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">
            Se detectaron {coFiring.length} instancia(s) donde dos patrones de
            riesgo se activaron juntos en un intervalo corto — señal más fuerte que
            un patrón aislado.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300">
            {coFiring.slice(0, 3).map((cf, i) => (
              <li key={i}>
                {new Date(cf.at).toLocaleDateString("es-MX")} ·{" "}
                <strong>{LABEL_INFO[cf.pair[0]].name}</strong> +{" "}
                <strong>{LABEL_INFO[cf.pair[1]].name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live feed */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Señales recientes
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            En vivo
          </span>
        </div>
        {signals.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin señales aún.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {signals.slice(0, 30).map((s) => {
              const isNew = newIds.has(s.id);
              const rStyle = RISK_STYLE[s.risk_level];
              const dot =
                s.risk_level === "alto" ? "bg-red-500"
                : s.risk_level === "medio" ? "bg-amber-400"
                : "bg-emerald-400";
              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 py-2.5 text-sm transition-colors duration-1000 ${
                    isNew ? "bg-violet-50 dark:bg-violet-950/40" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {LABEL_INFO[s.label].name}
                      </span>
                      {s.platform && (
                        <span className="ml-2 text-xs capitalize text-zinc-500 dark:text-zinc-400">
                          {platformLabel(s.platform)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${rStyle.bg} ${rStyle.text}`}>
                      {s.risk_level}
                    </span>
                    <time className="text-xs text-zinc-400">
                      {new Date(s.detected_at).toLocaleTimeString("es-MX", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* By label + by platform */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Por patrón
          </h2>
          {byLabel.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin señales en este periodo.</p>
          ) : (
            <ul className="space-y-3">
              {byLabel.map(({ label, count }) => {
                const pct = Math.round((count / signals.length) * 100);
                return (
                  <li key={label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {LABEL_INFO[label].name}
                      </span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {count}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Por plataforma
          </h2>
          {byPlatform.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin señales en este periodo.</p>
          ) : (
            <ul className="space-y-3">
              {byPlatform.map(({ platform, count }) => {
                const pct = Math.round((count / signals.length) * 100);
                return (
                  <li key={platform}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-zinc-800 dark:text-zinc-200">
                        {platformLabel(platform)}
                      </span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {count}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full bg-zinc-500 dark:bg-zinc-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Sparkline */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Señales por día (últimos {DAYS} días)
        </h2>
        <Sparkline data={byDay} />
      </section>
    </>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      alert
        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    }`}>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${
        alert ? "text-red-700 dark:text-red-300" : "text-zinc-900 dark:text-zinc-50"
      }`}>
        {value}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-16 items-end gap-0.5">
      {data.map((d) => (
        <div key={d.day} className="group relative flex-1">
          <div
            className="w-full rounded-sm bg-zinc-300 transition-all duration-500 group-hover:bg-zinc-500 dark:bg-zinc-700 dark:group-hover:bg-zinc-400"
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 0)}%` }}
          />
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
            {d.count > 0 ? `${d.count} señal${d.count > 1 ? "es" : ""}` : "–"}
          </div>
        </div>
      ))}
    </div>
  );
}
