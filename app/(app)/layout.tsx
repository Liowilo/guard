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
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          No se encontró tu perfil. Contacta al admin para que te agregue a
          una familia.
          <form action={logoutAction} className="mt-4">
            <button className="text-xs underline">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  const role = profile.role;
  const navItems: Array<{ href: string; label: string; roles: UserRole[] }> = [
    { href: "/tutor", label: "Vista tutor", roles: ["tutor"] },
    { href: "/menor", label: "Vista menor", roles: ["menor"] },
    { href: "/confianza", label: "Alertas SOS", roles: ["adulto_confianza"] },
    { href: "/pacto", label: "Pacto", roles: ["tutor", "menor", "adulto_confianza"] },
    { href: "/demo", label: "Clasificador", roles: ["tutor", "menor", "adulto_confianza"] },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <nav className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <Link
            href={ROLE_HOME[role]}
            className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Guard
          </Link>
          <ul className="flex flex-1 items-center gap-4 text-sm">
            {navItems
              .filter((item) => item.roles.includes(role))
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-zinc-500 dark:text-zinc-400 sm:inline">
              {profile.display_name} · {ROLE_LABEL[role]}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
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
