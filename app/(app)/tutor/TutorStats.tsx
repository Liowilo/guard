"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
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

const DAYS = 90;

interface Props {
  pactId: string;
  initialSignals: Signal[];
}

export default function TutorStats({ pactId, initialSignals }: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);
  const supabase = useRef(createClient());

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    async function subscribe() {
      // Esperar a que el JWT esté disponible antes de conectar realtime
      const { data: { session } } = await supabase.current.auth.getSession();
      if (!active || !session) return;

      channel = supabase.current
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
        .subscribe((status: string) => {
          if (active) setLive(status === "SUBSCRIBED");
        });
    }

    subscribe();

    return () => {
      active = false;
      setLive(false);
      if (channel) supabase.current.removeChannel(channel);
    };
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
          {live ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              Conectando…
            </span>
          )}
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

      {/* Señales por día — área chart interactivo */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <SignalDayChart data={byDay} />
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

const RANGE_OPTIONS = [
  { label: "Últimos 7 días", value: 7 },
  { label: "Últimas 2 semanas", value: 14 },
  { label: "Último mes", value: 30 },
  { label: "Últimos 3 meses", value: 90 },
];

function SignalDayChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const [range, setRange] = useState(14);
  const filtered = data.slice(-range);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Señales por día
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Total de señales detectadas por día
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={filtered} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillSignals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(113,113,122,0.15)" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("es-MX", { month: "short", day: "numeric" })
            }
          />
          <Tooltip
            cursor={{ stroke: "#8b5cf6", strokeWidth: 1, strokeDasharray: "4 2" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const count = payload[0].value as number;
              return (
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {label ? new Date(label).toLocaleDateString("es-MX", { month: "long", day: "numeric" }) : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-violet-600 dark:text-violet-400">
                    {count} señal{count !== 1 ? "es" : ""}
                  </p>
                </div>
              );
            }}
          />
          <Area
            dataKey="count"
            type="natural"
            fill="url(#fillSignals)"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}
