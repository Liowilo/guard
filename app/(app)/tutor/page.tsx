import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateRisk,
  countByLabel,
  countByPlatform,
  countByDay,
  detectCoFiringPatterns,
  LABEL_INFO,
  RISK_STYLE,
} from "@/lib/aggregation";
import type { Signal } from "@/lib/database.types";
import PactCreate from "./PactCreate";

export const metadata: Metadata = { title: "Vista tutor · Guard" };

const DAYS = 14;

export default async function TutorPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, family_id")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "tutor") redirect("/dashboard");

  // Busca cualquier pacto (signed o pending), no solo signed
  const { data: pact } = await supabase
    .from("pacts")
    .select("id, menor_id, status")
    .eq("tutor_id", userData.user.id)
    .in("status", ["signed", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Sin pacto: mostrar creador de pacto
  if (!pact) {
    const { data: familyMembers = [] } = await supabase
      .from("profiles")
      .select("id, display_name, role")
      .eq("family_id", profile.family_id)
      .neq("id", userData.user.id);

    const menores = (familyMembers ?? []).filter((p) => p.role === "menor");
    const adultos = (familyMembers ?? []).filter((p) => p.role === "adulto_confianza");

    return (
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hola, {profile.display_name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Para comenzar, invita a tu familia y crea el Pacto Digital.
        </p>
        <PactCreate menores={menores} adultos={adultos} familyId={profile.family_id} />
      </main>
    );
  }

  // Pacto pendiente: esperando firma del menor
  if (pact.status === "pending") {
    const { data: menorProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", pact.menor_id)
      .single();

    return (
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hola, {profile.display_name}
        </h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Pacto enviado a <strong>{menorProfile?.display_name ?? "el menor"}</strong>. Esperando su firma para activar el monitoreo.
        </div>
      </main>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const { data: signals = [] } = await supabase
    .from("signals")
    .select("*")
    .eq("pact_id", pact.id)
    .gte("detected_at", since.toISOString())
    .order("detected_at", { ascending: false });

  const { data: menorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", pact.menor_id)
    .single();

  const allSignals: Signal[] = signals ?? [];
  const overallRisk = aggregateRisk(allSignals);
  const byLabel = countByLabel(allSignals);
  const byPlatform = countByPlatform(allSignals);
  const byDay = countByDay(allSignals, DAYS);
  const coFiring = detectCoFiringPatterns(allSignals);
  const riskStyle = RISK_STYLE[overallRisk];
  const highRisk = allSignals.filter((s) => s.risk_level === "alto");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard · {menorProfile?.display_name ?? "Menor"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Señales de los últimos {DAYS} días. Sin contenido de mensajes.
          </p>
        </div>
        <div className={`rounded-lg border px-4 py-2 text-center ${riskStyle.bg} ${riskStyle.border}`}>
          <div className={`text-xs font-medium uppercase tracking-wide ${riskStyle.text}`}>
            Riesgo global
          </div>
          <div className={`text-xl font-bold capitalize ${riskStyle.text}`}>
            {overallRisk}
          </div>
        </div>
      </header>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Señales totales" value={allSignals.length} />
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By label */}
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Por patrón
          </h2>
          {byLabel.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin señales en este periodo.</p>
          ) : (
            <ul className="space-y-3">
              {byLabel.map(({ label, count }) => {
                const pct = Math.round((count / allSignals.length) * 100);
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
                        className="h-full bg-zinc-800 dark:bg-zinc-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* By platform */}
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Por plataforma
          </h2>
          {byPlatform.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin señales en este periodo.</p>
          ) : (
            <ul className="space-y-3">
              {byPlatform.map(({ platform, count }) => {
                const pct = Math.round((count / allSignals.length) * 100);
                return (
                  <li key={platform}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-zinc-800 dark:text-zinc-200">
                        {platform}
                      </span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {count}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full bg-zinc-500 dark:bg-zinc-400"
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

      {/* Recent high-risk */}
      {highRisk.length > 0 && (
        <section className="rounded-lg border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-red-800 dark:text-red-200">
            Señales de alto riesgo recientes
          </h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {highRisk.slice(0, 10).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {LABEL_INFO[s.label].name}
                  </span>
                  {s.platform && (
                    <span className="ml-2 text-xs capitalize text-zinc-500">
                      {s.platform}
                    </span>
                  )}
                </div>
                <time className="shrink-0 text-xs text-zinc-400">
                  {new Date(s.detected_at).toLocaleString("es-MX", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${
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
            className="w-full rounded-sm bg-zinc-300 transition-colors group-hover:bg-zinc-500 dark:bg-zinc-700 dark:group-hover:bg-zinc-400"
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
