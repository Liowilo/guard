import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Signal } from "@/lib/database.types";
import PactCreate from "./PactCreate";
import TutorStats from "./TutorStats";

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

  const { data: pact } = await supabase
    .from("pacts")
    .select("id, menor_id, status")
    .eq("tutor_id", userData.user.id)
    .in("status", ["signed", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  const initialSignals: Signal[] = signals ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard · {menorProfile?.display_name ?? "Menor"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Señales de los últimos {DAYS} días. Sin contenido de mensajes.
        </p>
      </header>

      <TutorStats pactId={pact.id} initialSignals={initialSignals} />
    </main>
  );
}
