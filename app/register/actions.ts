"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/database.types";

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const display_name = formData.get("display_name") as string;
  const role = formData.get("role") as UserRole;
  const family_code = (formData.get("family_code") as string)?.trim();

  if (!email || !password || !display_name || !role) {
    redirect("/register?error=Todos+los+campos+son+requeridos");
  }

  if (role !== "tutor" && !family_code) {
    redirect("/register?error=El+codigo+de+familia+es+requerido");
  }

  const supabase = await createClient();

  // Verificar código de familia ANTES de crear el usuario (política anon permite SELECT)
  let family_id: string | null = null;
  if (role !== "tutor") {
    const { data: family } = await supabase
      .from("families")
      .select("id")
      .eq("id", family_code)
      .single();

    if (!family) {
      redirect("/register?error=Codigo+de+familia+invalido");
    }
    family_id = family.id;
  }

  // Crear usuario en Supabase Auth
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name } },
  });

  if (signUpError || !authData.user) {
    redirect(`/register?error=${encodeURIComponent(signUpError?.message ?? "Error al crear cuenta")}`);
  }

  // A partir de aquí el cliente ya tiene la sesión en memoria (email confirm desactivado)

  // Si es tutor: crear la familia ahora (autenticado)
  if (role === "tutor") {
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({ name: `Familia de ${display_name}` })
      .select("id")
      .single();

    if (familyError || !family) {
      redirect(`/register?error=${encodeURIComponent(familyError?.message ?? "Error creando familia")}`);
    }
    family_id = family.id;
  }

  // Crear perfil (autenticado, RLS profiles_self_insert: id = auth.uid())
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    display_name,
    role,
    family_id: family_id!,
  });

  if (profileError) {
    redirect(`/register?error=${encodeURIComponent(profileError.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
