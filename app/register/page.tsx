import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registerAction } from "./actions";

export const metadata: Metadata = { title: "Crear cuenta · Guard" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

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
            Crear cuenta
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Elige tu rol dentro del Pacto Digital.
          </p>
        </header>

        <form
          action={registerAction}
          className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {sp.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {sp.error}
            </div>
          )}

          <Field id="display_name" label="Nombre" type="text" placeholder="María García" required />
          <Field id="email" label="Correo" type="email" placeholder="maria@ejemplo.com" required />
          <Field id="password" label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" required />

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Rol
            </label>
            <select
              id="role"
              name="role"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">Selecciona tu rol…</option>
              <option value="tutor">Tutor (padre / madre / responsable)</option>
              <option value="menor">Menor (adolescente)</option>
              <option value="adulto_confianza">Adulto de confianza</option>
            </select>
          </div>

          <div id="family-code-field">
            <label htmlFor="family_code" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Código de familia{" "}
              <span className="text-xs font-normal text-zinc-500">(requerido si no eres tutor)</span>
            </label>
            <input
              id="family_code"
              name="family_code"
              type="text"
              placeholder="UUID que te compartió el tutor"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Iniciar sesión
          </Link>
        </p>

        <details className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <summary className="cursor-pointer font-medium">Cómo funciona el registro</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>El <strong>tutor</strong> se registra primero — se crea una familia automáticamente.</li>
            <li>El tutor copia su <strong>código de familia</strong> desde su dashboard.</li>
            <li>El <strong>menor</strong> y el <strong>adulto de confianza</strong> se registran con ese código.</li>
            <li>El tutor crea el Pacto Digital desde su vista.</li>
            <li>El menor firma el pacto desde su vista.</li>
          </ol>
        </details>
      </div>
    </main>
  );
}

function Field({
  id, label, type, placeholder, required,
}: {
  id: string; label: string; type: string; placeholder: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
    </div>
  );
}
