"use client";

import { useState } from "react";
import { triggerSosAction } from "./actions";

export default function SosButton({
  pactId,
  trustedAdultId,
  trustedAdultName,
}: {
  pactId: string;
  trustedAdultId: string;
  trustedAdultName: string;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConfirm() {
    setState("sending");
    const result = await triggerSosAction(pactId, trustedAdultId);
    if (result?.error) {
      setErrorMsg(result.error);
      setState("error");
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Alerta enviada a <strong>{trustedAdultName}</strong>. Espera su respuesta.
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Error: {errorMsg}
        <button
          onClick={() => setState("idle")}
          className="ml-3 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (state === "confirm") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
          ¿Confirmas el SOS?
        </p>
        <p className="mt-1 text-xs text-red-700 dark:text-red-300">
          Se enviará una alerta a <strong>{trustedAdultName}</strong>. Tu tutor
          NO recibirá notificación de este SOS.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleConfirm}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Sí, enviar alerta
          </button>
          <button
            onClick={() => setState("idle")}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("confirm")}
      disabled={state === "sending"}
      className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
    >
      {state === "sending" ? "Enviando…" : "Botón SOS — Contactar adulto de confianza"}
    </button>
  );
}
