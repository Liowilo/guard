import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME = {
  tutor: "/tutor",
  menor: "/menor",
  adulto_confianza: "/confianza",
} as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (!profile) redirect("/login");
  redirect(ROLE_HOME[profile.role]);
}
