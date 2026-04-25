"use client";

import { useState } from "react";
import { createPactAction } from "./actions";
import { LABEL_INFO } from "@/lib/aggregation";
import type { Profile } from "@/lib/database.types";

const ALL_LABELS = Object.keys(LABEL_INFO) as (keyof typeof LABEL_INFO)[];

export default function PactCreate({
  menores,
  adultos,
  familyId,
}: {
  menores: Pick<Profile, "id" | "display_name">[];
  adultos: Pick<Profile, "id" | "display_name">[];
  familyId: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await createPactAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Family code */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Código de familia
        </h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Comparte este código con el menor y el adulto de confianza para que puedan crear su cuenta.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 break-all">
            {familyId}
          </code>
          <CopyButton text={familyId} />
        </div>
      </section>

      {menores.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Ningún menor se ha unido a tu familia aún. Comparte el código de familia para que se registren.
        </div>
      ) : (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Proponer Pacto Digital
          </h2>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="menor_id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Menor
              </label>
              <select
                id="menor_id"
                name="menor_id"
                required
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">Selecciona…</option>
                {menores.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>

            {adultos.length > 0 && (
              <div>
                <label htmlFor="trusted_adult_id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Adulto de confianza{" "}
                  <span className="text-xs font-normal text-zinc-500">(opcional)</span>
                </label>
                <select
                  id="trusted_adult_id"
                  name="trusted_adult_id"
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Sin adulto de confianza</option>
                  {adultos.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Patrones a monitorear
              </p>
              <ul className="space-y-2">
                {ALL_LABELS.map((label) => (
                  <li key={label} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`cat-${label}`}
                      name="categories"
                      value={label}
                      defaultChecked
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                    />
                    <label htmlFor={`cat-${label}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium">{LABEL_INFO[label].name}</span>
                      <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                        — {LABEL_INFO[label].desc}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Enviando…" : "Proponer pacto al menor"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
