import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/login/actions";
import type { UserRole } from "@/lib/database.types";

const ROLE_LABEL: Record<UserRole, string> = {
  tutor: "Tutor",
  menor: "Menor",
  adulto_confianza: "Adulto de confianza",
};

const ROLE_HOME: Record<UserRole, string> = {
  tutor: "/tutor",
  menor: "/menor",
  adulto_confianza: "/confianza",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, family_id")
    .eq("id", userData.user.id)
    .single();

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">
          No se encontró tu perfil. Contacta al admin para que te agregue a una familia.
          <form action={logoutAction} className="mt-4">
            <button className="text-xs underline text-red-400/70">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  const role = profile.role;
  const navItems: Array<{ href: string; label: string; roles: UserRole[] }> = [
    { href: "/tutor",     label: "Vista tutor",    roles: ["tutor"] },
    { href: "/menor",     label: "Vista menor",    roles: ["menor"] },
    { href: "/confianza", label: "Alertas SOS",    roles: ["adulto_confianza"] },
    { href: "/pacto",     label: "Pacto",          roles: ["tutor", "menor", "adulto_confianza"] },
    { href: "/demo",      label: "Clasificador",   roles: ["tutor", "menor", "adulto_confianza"] },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3.5">
          <Link
            href={ROLE_HOME[role]}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-sm font-semibold tracking-tight text-zinc-50">Guard</span>
            <span className="text-zinc-700">·</span>
            <span className="text-sm font-normal text-zinc-500">Pacto Digital</span>
          </Link>
          <ul className="flex flex-1 items-center gap-1 text-sm">
            {navItems
              .filter((item) => item.roles.includes(role))
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-md px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden text-xs text-zinc-600 sm:inline">
              {profile.display_name} · {ROLE_LABEL[role]}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
