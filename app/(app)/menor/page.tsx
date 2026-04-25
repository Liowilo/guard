import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateRisk,
  countByLabel,
  countByPlatform,
  LABEL_INFO,
  RISK_STYLE,
} from "@/lib/aggregation";
import type { Signal } from "@/lib/database.types";
import SosButton from "./SosButton";
import SignPactBanner from "./SignPactBanner";

export const metadata: Metadata = { title: "Tu vista · Guard" };

const DAYS = 14;

export default async function MenorPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "menor") redirect("/dashboard");

  const { data: pact } = await supabase
    .from("pacts")
    .select(`
      id, status, monitored_categories, trusted_adult_id,
      trusted_adult:profiles!pacts_trusted_adult_id_fkey(display_name),
      tutor:profiles!pacts_tutor_id_fkey(display_name)
    `)
    .eq("menor_id", userData.user.id)
    .in("status", ["signed", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: any };

  // Pacto pendiente: mostrar banner de firma
  if (pact?.status === "pending") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hola, {profile.display_name}
          </h1>
        </header>
        <SignPactBanner
          pactId={pact.id}
          tutorName={pact.tutor?.display_name ?? "Tu tutor"}
          categories={pact.monitored_categories}
        />
      </main>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const { data: signals = [] } = pact
    ? await supabase
        .from("signals")
        .select("*")
        .eq("pact_id", pact.id)
        .gte("detected_at", since.toISOString())
        .order("detected_at", { ascending: false })
    : { data: [] };

  const allSignals: Signal[] = signals ?? [];
  const overallRisk = aggregateRisk(allSignals);
  const byLabel = countByLabel(allSignals);
  const byPlatform = countByPlatform(allSignals);
  const riskStyle = RISK_STYLE[overallRisk];
  const highRisk = allSignals.filter((s) => s.risk_level === "alto");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hola, {profile.display_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Esto es exactamente lo que tu tutor{pact ? ` (${pact.tutor.display_name})` : ""} está
          viendo. Sin contenido de mensajes — solo señales agregadas.
        </p>
      </header>

      {/* SOS */}
      {pact?.trusted_adult_id && (
        <SosButton
          pactId={pact.id}
          trustedAdultId={pact.trusted_adult_id}
          trustedAdultName={pact.trusted_adult?.display_name ?? "Adulto de confianza"}
        />
      )}

      {!pact && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Tu pacto aún no está firmado. Habla con tu tutor para activar el
          monitoreo.
        </div>
      )}

      {/* Risk banner */}
      <div className={`rounded-lg border p-4 ${riskStyle.bg} ${riskStyle.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${riskStyle.text}`}>
              Nivel de riesgo actual
            </p>
            <p className={`text-xs ${riskStyle.text}`}>
              Basado en señales de los últimos {DAYS} días.
            </p>
          </div>
          <span className={`text-2xl font-bold capitalize ${riskStyle.text}`}>
            {overallRisk}
          </span>
        </div>
      </div>

      {/* What is monitored */}
      {pact && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Qué se monitorea
          </h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            El modelo corre en tu dispositivo y detecta estos patrones. Tus
            mensajes nunca se envían al servidor.
          </p>
          <ul className="space-y-2">
            {pact.monitored_categories.map((label: string) => (
              <li key={label} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-zinc-400" />
                <div>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {LABEL_INFO[label as keyof typeof LABEL_INFO]?.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {LABEL_INFO[label as keyof typeof LABEL_INFO]?.desc}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Signals — same as tutor sees */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Lo que ve tu tutor (últimos {DAYS} días)
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Esta es la información exacta que tu tutor está viendo ahora mismo.
        </p>

        {allSignals.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin señales en este periodo.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {allSignals.length}
                </span>{" "}
                <span className="text-zinc-500 dark:text-zinc-400">señales</span>
              </div>
              <div>
                <span className="font-semibold text-red-700 dark:text-red-300">
                  {highRisk.length}
                </span>{" "}
                <span className="text-zinc-500 dark:text-zinc-400">de alto riesgo</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Por patrón
              </div>
              <ul className="space-y-2">
                {byLabel.map(({ label, count }) => (
                  <li key={label} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {LABEL_INFO[label].name}
                    </span>
                    <span className="tabular-nums text-zinc-500">{count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Por plataforma
              </div>
              <ul className="space-y-2">
                {byPlatform.map(({ platform, count }) => (
                  <li key={platform} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-zinc-800 dark:text-zinc-200">
                      {platform}
                    </span>
                    <span className="tabular-nums text-zinc-500">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
