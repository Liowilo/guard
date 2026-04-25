import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Guard <span className="text-zinc-400">·</span>{" "}
            <span className="font-normal text-zinc-500">Pacto Digital</span>
          </span>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/demo"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Demo del clasificador
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      <section className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Una capa de protección digital que trata al menor como aliado, no
            como sospechoso.
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            La detección corre <strong>on-device</strong> — los mensajes nunca
            salen del dispositivo del menor. Tutor y menor firman un Pacto
            Digital donde el adolescente ve <em>exactamente</em> qué se
            monitorea, y el tutor recibe únicamente señales agregadas, nunca
            conversaciones.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Feature title="On-device" desc="Modelo XLM-R cuantizado, ~50 ms por mensaje. Ningún contenido sale del dispositivo." />
            <Feature title="Transparencia" desc="El menor ve la misma vista que su tutor. Mismo dato, misma interfaz." />
            <Feature title="Botón SOS" desc="Contacta a un adulto de confianza distinto al tutor — el riesgo a veces está en casa." />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</div>
    </div>
  );
}
