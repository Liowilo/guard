import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GradientText from "@/components/GradientText";
import HeroLaserFlow from "@/components/HeroLaserFlow";
import NavBrand from "@/components/NavBrand";
import PageBlur from "@/components/PageBlur";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <div
          className="relative flex w-full max-w-2xl items-center justify-between rounded-full overflow-hidden px-2 py-1.5 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/11"
          style={{
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Glass base tint */}
          <div className="pointer-events-none absolute inset-0 bg-zinc-900/30" />
          {/* Brand emerald color tint */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/8 via-transparent to-teal-400/5" />
          {/* Top specular line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/55 to-transparent" />
          {/* Inner dome highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-full"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(255,255,255,0.09) 0%, transparent 100%)",
            }}
          />
          {/* Animated iridescent sweep */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 20%, rgba(52,211,153,0.07) 38%, rgba(255,255,255,0.05) 50%, rgba(20,184,166,0.06) 62%, transparent 80%)",
              backgroundSize: "300% 100%",
              animation: "navShimmer 8s ease-in-out infinite",
            }}
          />

          {/* Logo */}
          <Link
            href="/"
            className="relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/8 transition-colors"
          >
            <NavBrand />
          </Link>

          {/* Links + CTAs */}
          <div className="relative z-10 flex items-center gap-0.5">
            <Link
              href="/demo"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/9 hover:text-zinc-100 transition-all"
            >
              Demo
            </Link>
            <Link
              href="/register"
              className="hidden sm:block rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/9 hover:text-zinc-100 transition-all"
            >
              Registrarse
            </Link>
            <Link
              href="/login"
              className="ml-1 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 overflow-hidden pt-16">
        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(63,63,70,0.65) 1px, transparent 1px), linear-gradient(to bottom, rgba(63,63,70,0.65) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, #000 8%, #000 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, #000 8%, #000 82%, transparent 100%)",
            animation: "gridBreathe 5s ease-in-out infinite",
          }}
        />
        {/* Animated background */}
        <style>{`
          @keyframes orbDrift1 {
            0%, 100% { transform: translateX(-50%) translateY(0px) scale(1); }
            33%       { transform: translateX(-53%) translateY(-40px) scale(1.08); }
            66%       { transform: translateX(-47%) translateY(22px) scale(0.96); }
          }
          @keyframes orbDrift2 {
            0%, 100% { transform: translateY(0px) scale(1); }
            50%       { transform: translateY(-28px) scale(1.12); }
          }
          @keyframes orbDrift3 {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            40%       { transform: translateY(30px) translateX(-18px); }
            70%       { transform: translateY(-12px) translateX(14px); }
          }
          @keyframes gridBreathe {
            0%, 100% { opacity: 0.3; }
            50%       { opacity: 0.85; }
          }
          @keyframes particleFloat {
            0%   { transform: translateY(0px);    opacity: 0; }
            8%   { opacity: 0.65; }
            88%  { opacity: 0.4; }
            100% { transform: translateY(-340px); opacity: 0; }
          }
        `}</style>
        <div className="pointer-events-none absolute inset-0">
          {/* Orb principal centro */}
          <div
            className="absolute -top-15 left-1/2 w-175 h-112.5 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(52,211,153,0.13) 0%, transparent 70%)",
              animation: "orbDrift1 15s ease-in-out infinite",
            }}
          />
          {/* Orb secundario derecha */}
          <div
            className="absolute -top-22.5 -right-20 w-120 h-80 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(20,184,166,0.09) 0%, transparent 70%)",
              animation: "orbDrift2 20s ease-in-out infinite",
            }}
          />
          {/* Orb secundario izquierda */}
          <div
            className="absolute top-20 -left-15 w-105 h-70 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(74,222,128,0.07) 0%, transparent 70%)",
              animation: "orbDrift3 25s ease-in-out infinite",
            }}
          />
          {/* Partículas flotantes */}
          {[
            { left: 10, delay: 0, dur: 9 },
            { left: 18, delay: 2.1, dur: 11 },
            { left: 26, delay: 0.8, dur: 8.5 },
            { left: 34, delay: 3.5, dur: 10 },
            { left: 42, delay: 1.4, dur: 12 },
            { left: 50, delay: 4.2, dur: 9.5 },
            { left: 58, delay: 0.5, dur: 11.5 },
            { left: 66, delay: 2.8, dur: 8 },
            { left: 74, delay: 1.9, dur: 10.5 },
            { left: 82, delay: 3.1, dur: 13 },
            { left: 90, delay: 0.3, dur: 9 },
            { left: 22, delay: 5.0, dur: 10 },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute bottom-20 w-0.5 h-0.5 rounded-full bg-emerald-400/50"
              style={{
                left: `${p.left}%`,
                animation: `particleFloat ${p.dur}s ${p.delay}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* LaserFlow — blends over existing background via screen */}
        <HeroLaserFlow />

        <div className="relative mx-auto max-w-4xl px-6 pt-8 pb-20 sm:pt-10 sm:pb-24 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Clasificación on-device · Los mensajes nunca salen del dispositivo
          </div>

          {/* App name */}
          <div className="mb-6 leading-none tracking-tighter">
            <div className="inline-flex items-baseline">
              <span className="text-6xl font-bold text-white sm:text-7xl lg:text-8xl">
                Guard
              </span>
              <GradientText
                colors={["#6EE7B7", "#34D399", "#22C55E"]}
                animationSpeed={8}
                showBorder={false}
                className="text-6xl sm:text-7xl lg:text-8xl font-extrabold! m-0!"
              >
                IA
              </GradientText>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Protección digital que
            <br />
            <span className="text-zinc-500">trata al menor como aliado</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Detecta patrones de grooming en WhatsApp Web y Discord directamente
            en el dispositivo. Tutor y menor firman un{" "}
            <span className="text-zinc-200">Pacto Digital</span> y ven
            exactamente los mismos datos — ningún mensaje, solo señales.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors shadow-lg shadow-white/10"
            >
              Crear cuenta gratuita
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              Ver demo del clasificador
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={<IconOnDevice />}
            title="On-device"
            desc="Modelo XLM-R cuantizado a ~113 MB. Inferencia en ~50 ms sin conexión. Ningún contenido sale del dispositivo del menor."
          />
          <FeatureCard
            icon={<IconTransparency />}
            title="Transparencia total"
            desc="El menor ve exactamente la misma vista que su tutor — mismo dato, misma interfaz. Sin vigilancia encubierta."
          />
          <FeatureCard
            icon={<IconSos />}
            title="Botón SOS privado"
            desc="Contacta a un adulto de confianza distinto al tutor. El tutor nunca accede a este canal — porque el riesgo a veces está en casa."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Cómo funciona
          </p>
          <div className="mt-10 grid gap-px sm:grid-cols-4 rounded-xl overflow-hidden border border-zinc-800">
            <Step
              number="01"
              title="Pacto firmado"
              desc="Tutor y menor acuerdan qué categorías se monitoran y quién es el adulto de confianza."
            />
            <Step
              number="02"
              title="Extensión activa"
              desc="La extensión Chrome analiza mensajes localmente en WhatsApp Web y Discord."
            />
            <Step
              number="03"
              title="Solo señales"
              desc="Únicamente el timestamp, plataforma y etiqueta detectada llegan al dashboard."
            />
            <Step
              number="04"
              title="Vista compartida"
              desc="Tutor y menor ven los mismos datos. Si hay riesgo, el menor puede activar el SOS."
            />
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-10">
          <div className="grid gap-8 sm:grid-cols-3">
            <PrivacyStat label="Contenido subido al servidor" value="0 bytes" />
            <PrivacyStat
              label="Modelos de 5 patrones de grooming"
              value="XLM-R"
            />
            <PrivacyStat
              label="Acceso del tutor al canal SOS"
              value="Ninguno"
            />
          </div>
        </div>
      </section>

      <PageBlur />

      {/* Footer */}
      <footer id="page-footer" className="border-t border-zinc-800/60 py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-600">
          <span>
            guard
            <span
              style={{
                backgroundImage:
                  "linear-gradient(to right, #6EE7B7, #34D399, #22C55E)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              IA
            </span>
            {" · "}Pacto Digital
          </span>
          <span className="italic">El menor es aliado, no sospechoso.</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 group-hover:border-zinc-600 transition-colors">
        {icon}
      </div>
      <div className="text-sm font-semibold text-zinc-100">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-500">{desc}</div>
    </div>
  );
}

function Step({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-zinc-900/60 p-6">
      <div className="text-xs font-mono text-zinc-600 mb-3">{number}</div>
      <div className="text-sm font-semibold text-zinc-100 mb-2">{title}</div>
      <div className="text-sm leading-6 text-zinc-500">{desc}</div>
    </div>
  );
}

function PrivacyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-2xl font-bold tracking-tight text-zinc-100">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function IconOnDevice() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="2"
        y="3"
        width="12"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5 12v1M11 12v1M4 13h8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M6 7.5l1.5 1.5L10 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTransparency() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 2.5v11M2.5 8h11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M4.5 4.5c1 1.5 1.5 2.5 3.5 3.5-2 1-2.5 2-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSos() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2L8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
      <path
        d="M2.5 13.5L5 3.5C5.8 1.2 10.2 1.2 11 3.5l2.5 10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
