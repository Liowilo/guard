"use client";

import { useState } from "react";
import { signPactAction } from "./actions";
import { LABEL_INFO } from "@/lib/aggregation";

export default function SignPactBanner({
  pactId,
  tutorName,
  categories,
}: {
  pactId: string;
  tutorName: string;
  categories: string[];
}) {
  const [state, setState] = useState<"idle" | "signing" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSign() {
    setState("signing");
    const result = await signPactAction(pactId);
    if (result?.error) {
      setError(result.error);
      setState("error");
    } else {
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Pacto firmado. El monitoreo está activo.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Pacto Digital pendiente de tu firma
      </h2>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
        Tu tutor <strong>{tutorName}</strong> propuso monitorear los siguientes patrones en tus mensajes.
        El análisis corre <em>en tu dispositivo</em> — ningún mensaje sale del teléfono o computadora.
        Solo la señal categorizada llega al dashboard.
      </p>

      <ul className="mt-3 space-y-1.5">
        {categories.map((label) => {
          const info = LABEL_INFO[label as keyof typeof LABEL_INFO];
          return (
            <li key={label} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                <strong>{info?.name}</strong> — {info?.desc}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs font-medium text-amber-900 dark:text-amber-100">
        Al firmar, aceptas este acuerdo de forma voluntaria. Puedes ver en todo momento lo mismo que ve tu tutor.
      </p>

      {(state === "error") && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSign}
          disabled={state === "signing"}
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-700"
        >
          {state === "signing" ? "Firmando…" : "Firmar el pacto"}
        </button>
      </div>
    </div>
  );
}
