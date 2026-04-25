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
    <div className="space-y-4">
      {/* Family code */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-100">
          Código de familia
        </h2>
        <p className="mb-3 text-xs text-zinc-500 leading-5">
          Comparte este código con el menor y el adulto de confianza para que puedan crear su cuenta.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-400 break-all">
            {familyId}
          </code>
          <CopyButton text={familyId} />
        </div>
      </section>

      {menores.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
          Ningún menor se ha unido a tu familia aún. Comparte el código de familia para que se registren.
        </div>
      ) : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-5 text-sm font-semibold text-zinc-100">
            Proponer Pacto Digital
          </h2>
          <form action={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="menor_id"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Menor
              </label>
              <select
                id="menor_id"
                name="menor_id"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none"
              >
                <option value="">Selecciona…</option>
                {menores.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>

            {adultos.length > 0 && (
              <div>
                <label
                  htmlFor="trusted_adult_id"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Adulto de confianza{" "}
                  <span className="font-normal text-zinc-600">(opcional)</span>
                </label>
                <select
                  id="trusted_adult_id"
                  name="trusted_adult_id"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none"
                >
                  <option value="">Sin adulto de confianza</option>
                  {adultos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="mb-3 text-xs font-medium text-zinc-400">
                Patrones a monitorear
              </p>
              <ul className="space-y-3">
                {ALL_LABELS.map((label) => (
                  <li key={label} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`cat-${label}`}
                      name="categories"
                      value={label}
                      defaultChecked
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                    />
                    <label
                      htmlFor={`cat-${label}`}
                      className="cursor-pointer text-sm"
                    >
                      <span className="font-medium text-zinc-200">
                        {LABEL_INFO[label].name}
                      </span>
                      <span className="ml-1.5 text-xs text-zinc-500">
                        — {LABEL_INFO[label].desc}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-white/5 transition-colors hover:bg-zinc-100 disabled:opacity-50"
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
      className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
    >
      {copied ? "Copiado ✓" : "Copiar"}
    </button>
  );
}
