import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "./actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Iniciar sesión · Guard",
};

const DEMO_ACCOUNTS = [
  { email: "tutor@demo.guard", role: "Tutor (Mamá Demo)" },
  { email: "menor@demo.guard", role: "Menor (Sofía, 14)" },
  { email: "confianza@demo.guard", role: "Adulto de confianza (Tía Lucía)" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(sp.next || "/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Guard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Pacto Digital — accede con tu rol asignado.
          </p>
        </header>

        <form
          action={loginAction}
          className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {sp.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {sp.error}
            </div>
          )}
          <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={sp.email ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Crear cuenta
          </Link>
        </p>

        <details className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cuentas de demo
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {DEMO_ACCOUNTS.map((a) => (
              <li
                key={a.email}
                className="flex items-baseline justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-950"
              >
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{a.email}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{a.role}</span>
              </li>
            ))}
            <li className="text-xs text-zinc-500 dark:text-zinc-400">
              Contraseña común: <code className="font-mono">demo1234</code>
            </li>
          </ul>
        </details>
      </div>
    </main>
  );
}
