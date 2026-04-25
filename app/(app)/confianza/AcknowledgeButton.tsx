"use client";

import { useState } from "react";
import { acknowledgeSOSAction } from "./actions";

export default function AcknowledgeButton({ eventId }: { eventId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function handleClick() {
    setState("loading");
    const result = await acknowledgeSOSAction(eventId);
    if (result?.error) {
      setError(result.error);
      setState("idle");
    } else {
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        Atendido
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
      >
        {state === "loading" ? "Guardando…" : "Marcar como atendido"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
