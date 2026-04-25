import type { Metadata } from "next";
import Classifier from "./Classifier";

export const metadata: Metadata = {
  title: "Demo · Guardia Classifier",
  description: "Inferencia ONNX en el navegador para detección de patrones de grooming.",
};

const SAMPLES = [
  "eres tan especial, nunca he conocido a alguien como tú, eres mi todo 💕",
  "te puedo mandar un regalo, solo necesito tu dirección, será nuestro secreto",
  "tus amigos no te entienden como yo, deja de hablarles tanto",
  "mejor pasémonos a otra app, aquí me siento incómodo hablando contigo",
  "no le digas a nadie de esto, ¿me mandas una foto tuya?",
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Guardia · POC de inferencia on-device
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            El modelo (XLM-R cuantizado, ~113 MB) se descarga una vez al navegador y corre 100%
            local vía ONNX Runtime Web. Ningún mensaje sale del dispositivo.
          </p>
        </header>
        <Classifier samples={SAMPLES} />
      </div>
    </div>
  );
}
