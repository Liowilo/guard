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

const RISK_BADGE = {
  alto:  "border border-red-500/30  bg-red-500/10  text-red-400",
  medio: "border border-amber-500/30 bg-amber-500/10 text-amber-400",
  bajo:  "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
} as const;

const RISK_DOT = {
  alto:  "bg-red-500",
  medio: "bg-amber-400",
  bajo:  "bg-emerald-400",
} as const;

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
  const byLabel    = countByLabel(signals);
  const byPlatform = countByPlatform(signals);
  const byDay      = countByDay(signals, DAYS);
  const coFiring   = detectCoFiringPatterns(signals);
  const riskStyle  = RISK_STYLE[overallRisk];
  const highRisk   = signals.filter((s) => s.risk_level === "alto");

  const platformLabel = (p: string | null) =>
    p ? p.replace("_web", "").replace("_", " ") : "desconocido";

  return (
    <>
      {/* Risk badge */}
      <div className={`rounded-xl border px-5 py-4 text-center transition-colors ${riskStyle.bg} ${riskStyle.border}`}>
        <p className={`text-xs font-medium uppercase tracking-widest ${riskStyle.text}`}>
          Riesgo global
        </p>
        <p className={`mt-1 text-2xl font-bold capitalize ${riskStyle.text}`}>
          {overallRisk}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Señales totales"  value={signals.length} />
        <StatCard label="Alto riesgo"       value={highRisk.length}  alert={highRisk.length > 0} />
        <StatCard label="Plataformas"       value={byPlatform.length} />
        <StatCard label="Co-disparos"       value={coFiring.length}  alert={coFiring.length > 0} />
      </div>

      {/* Co-firing alert */}
      {coFiring.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-sm font-semibold text-red-400">
            Patrones combinados detectados
          </p>
          <p className="mt-1 text-xs text-red-400/70 leading-5">
            {coFiring.length} instancia{coFiring.length > 1 ? "s" : ""} donde dos patrones
            se activaron juntos en un intervalo corto — señal más fuerte que un patrón aislado.
          </p>
          <ul className="mt-3 space-y-1.5">
            {coFiring.slice(0, 3).map((cf, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-red-400/80">
                <span className="h-1 w-1 shrink-0 rounded-full bg-red-500" />
                {new Date(cf.at).toLocaleDateString("es-MX")} ·{" "}
                <strong>{LABEL_INFO[cf.pair[0]].name}</strong>
                {" "}+{" "}
                <strong>{LABEL_INFO[cf.pair[1]].name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live feed */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Señales recientes</h2>
          {live ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span className="h-2 w-2 rounded-full bg-zinc-700" />
              Conectando…
            </span>
          )}
        </div>

        {signals.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-600">Sin señales aún.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-zinc-800/60 overflow-y-auto">
            {signals.slice(0, 30).map((s) => {
              const isNew = newIds.has(s.id);
              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 py-2.5 text-sm transition-colors duration-1000 ${
                    isNew ? "bg-emerald-500/10" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${RISK_DOT[s.risk_level]}`} />
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-100">
                        {LABEL_INFO[s.label].name}
                      </span>
                      {s.platform && (
                        <span className="ml-2 text-xs capitalize text-zinc-600">
                          {platformLabel(s.platform)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${RISK_BADGE[s.risk_level]}`}>
                      {s.risk_level}
                    </span>
                    <time className="text-xs text-zinc-600">
                      {new Date(s.detected_at).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
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
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-5 text-sm font-semibold text-zinc-100">Por patrón</h2>
          {byLabel.length === 0 ? (
            <p className="text-sm text-zinc-600">Sin señales en este periodo.</p>
          ) : (
            <ul className="space-y-4">
              {byLabel.map(({ label, count }) => {
                const pct = Math.round((count / signals.length) * 100);
                return (
                  <li key={label}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-zinc-300">{LABEL_INFO[label].name}</span>
                      <span className="tabular-nums text-zinc-500">{count}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-5 text-sm font-semibold text-zinc-100">Por plataforma</h2>
          {byPlatform.length === 0 ? (
            <p className="text-sm text-zinc-600">Sin señales en este periodo.</p>
          ) : (
            <ul className="space-y-4">
              {byPlatform.map(({ platform, count }) => {
                const pct = Math.round((count / signals.length) * 100);
                return (
                  <li key={platform}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="capitalize text-zinc-300">{platformLabel(platform)}</span>
                      <span className="tabular-nums text-zinc-500">{count}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-teal-500 transition-all duration-500"
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

      {/* Señales por día */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <SignalDayChart data={byDay} />
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        alert
          ? "border-red-500/30 bg-red-500/10"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${
          alert ? "text-red-400" : "text-zinc-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const RANGE_OPTIONS = [
  { label: "7 días",   value: 7 },
  { label: "14 días",  value: 14 },
  { label: "30 días",  value: 30 },
  { label: "90 días",  value: 90 },
];

function SignalDayChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const [range, setRange] = useState(14);
  const filtered = data.slice(-range);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Señales por día</p>
          <p className="text-xs text-zinc-500">Total de señales detectadas por día</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setRange(o.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                range === o.value
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={filtered} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillSignals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(63,63,70,0.35)" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tick={{ fontSize: 11, fill: "#52525b" }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("es-MX", { month: "short", day: "numeric" })
            }
          />
          <Tooltip
            cursor={{ stroke: "#34d399", strokeWidth: 1, strokeDasharray: "4 2" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const count = payload[0].value as number;
              return (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
                  <p className="text-xs text-zinc-500">
                    {label
                      ? new Date(label).toLocaleDateString("es-MX", {
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-400">
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
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}
