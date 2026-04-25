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
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Hola, {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Para comenzar, invita a tu familia y crea el Pacto Digital.
          </p>
        </div>
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
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">
          Hola, {profile.display_name}
        </h1>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-400">
          Pacto enviado a{" "}
          <strong className="text-amber-300">{menorProfile?.display_name ?? "el menor"}</strong>.
          Esperando su firma para activar el monitoreo.
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
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-600">
            Dashboard · tutor
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {menorProfile?.display_name ?? "Menor"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Señales de los últimos {DAYS} días · sin contenido de mensajes
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-500 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Monitoreo activo
        </div>
      </header>

      <TutorStats pactId={pact.id} initialSignals={initialSignals} />
    </main>
  );
}
