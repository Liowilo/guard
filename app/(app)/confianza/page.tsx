import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AcknowledgeButton from "./AcknowledgeButton";

export const metadata: Metadata = { title: "Alertas SOS · Guard" };

export default async function ConfianzaPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "adulto_confianza") redirect("/dashboard");

  const { data: events = [] } = await supabase
    .from("sos_events")
    .select(`
      *,
      triggered_by_profile:profiles!sos_events_triggered_by_fkey(display_name)
    `)
    .eq("trusted_adult_id", userData.user.id)
    .order("triggered_at", { ascending: false }) as { data: any[] | null };

  const pending = (events ?? []).filter((e) => !e.acknowledged_at);
  const acknowledged = (events ?? []).filter((e) => e.acknowledged_at);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Alertas SOS
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Hola, {profile.display_name}. Recibes estas alertas porque un menor
          te designó como adulto de confianza. El tutor NO ve este canal.
        </p>
      </header>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
            Sin atender ({pending.length})
          </h2>
          {pending.map((e) => (
            <SosCard key={e.id} event={e} />
          ))}
        </section>
      )}

      {pending.length === 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Sin alertas pendientes.
        </div>
      )}

      {acknowledged.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Atendidas ({acknowledged.length})
          </h2>
          {acknowledged.slice(0, 5).map((e) => (
            <SosCard key={e.id} event={e} dimmed />
          ))}
        </section>
      )}
    </main>
  );
}

function SosCard({ event, dimmed }: { event: any; dimmed?: boolean }) {
  const name = event.triggered_by_profile?.display_name ?? "Menor";
  const at = new Date(event.triggered_at).toLocaleString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`rounded-lg border p-4 ${
      dimmed
        ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${
            dimmed
              ? "text-zinc-700 dark:text-zinc-300"
              : "text-red-800 dark:text-red-200"
          }`}>
            SOS de {name}
          </p>
          <time className={`text-xs ${
            dimmed ? "text-zinc-400" : "text-red-600 dark:text-red-400"
          }`}>
            {at}
          </time>
          {event.notes && (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {event.notes}
            </p>
          )}
        </div>
        {event.acknowledged_at ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Atendido
          </span>
        ) : (
          <AcknowledgeButton eventId={event.id} />
        )}
      </div>
    </div>
  );
}
