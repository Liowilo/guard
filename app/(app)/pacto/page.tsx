import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LABEL_INFO } from "@/lib/aggregation";
import type { Pact, Profile } from "@/lib/database.types";

export const metadata: Metadata = { title: "Pacto Digital · Guard" };

type PactWithProfiles = Pact & {
  menor: Pick<Profile, "display_name">;
  tutor: Pick<Profile, "display_name">;
  trusted_adult: Pick<Profile, "display_name"> | null;
};

export default async function PactoPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: pact } = await supabase
    .from("pacts")
    .select(`
      *,
      menor:profiles!pacts_menor_id_fkey(display_name),
      tutor:profiles!pacts_tutor_id_fkey(display_name),
      trusted_adult:profiles!pacts_trusted_adult_id_fkey(display_name)
    `)
    .or(`menor_id.eq.${userData.user.id},tutor_id.eq.${userData.user.id},trusted_adult_id.eq.${userData.user.id}`)
    .single() as { data: PactWithProfiles | null };

  if (!pact) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No se encontró un pacto asociado a tu cuenta.
        </p>
      </main>
    );
  }

  const isSigned = pact.status === "signed";
  const signedAt = pact.signed_by_tutor_at
    ? new Date(pact.signed_by_tutor_at).toLocaleDateString("es-MX", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pacto Digital
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Este acuerdo define qué se monitorea, quién lo ve, y qué derechos
          tiene el menor. Es transparente para todas las partes.
        </p>
      </header>

      {/* Status banner */}
      <div className={`rounded-lg border p-4 ${
        isSigned
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
      }`}>
        <div className={`text-sm font-semibold ${
          isSigned
            ? "text-emerald-800 dark:text-emerald-200"
            : "text-amber-800 dark:text-amber-200"
        }`}>
          {isSigned ? "Pacto firmado" : "Pendiente de firma"}
        </div>
        {isSigned && signedAt && (
          <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
            Firmado el {signedAt}
          </div>
        )}
      </div>

      {/* Parties */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Partes del acuerdo
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Party role="Tutor" name={pact.tutor.display_name} />
          <Party role="Menor" name={pact.menor.display_name} />
          <Party
            role="Adulto de confianza"
            name={pact.trusted_adult?.display_name ?? "No designado"}
            note="Receptor del botón SOS — distinto al tutor."
          />
        </div>
      </section>

      {/* What is monitored */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Patrones monitoreados
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          El modelo on-device detecta estas categorías en mensajes de redes
          sociales y videojuegos. <strong>El contenido de los mensajes nunca
          sale del dispositivo.</strong> Solo la categoría detectada y su nivel
          de riesgo se envían al dashboard.
        </p>
        <ul className="space-y-3">
          {pact.monitored_categories.map((label) => (
            <li key={label} className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-zinc-400" />
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {LABEL_INFO[label].name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {LABEL_INFO[label].desc}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Privacy guarantees */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Garantías de privacidad
        </h2>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Guarantee text="Los mensajes NUNCA salen del dispositivo del menor — solo la señal categorizada." />
          <Guarantee text="El tutor ve exactamente lo mismo que el menor: señales agregadas, sin contenido." />
          <Guarantee text="El botón SOS contacta al adulto de confianza directamente, sin pasar por el tutor." />
          <Guarantee text="El menor puede ver en tiempo real todo lo que su tutor está viendo." />
        </ul>
      </section>
    </main>
  );
}

function Party({ role, name, note }: { role: string; name: string; note?: string }) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-3 dark:bg-zinc-950">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {role}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {name}
      </div>
      {note && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</div>}
    </div>
  );
}

function Guarantee({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
      <span>{text}</span>
    </li>
  );
}
