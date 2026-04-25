"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export async function createPactAction(formData: FormData) {
  const menor_id = formData.get("menor_id") as string;
  const trusted_adult_id = (formData.get("trusted_adult_id") as string) || null;
  const categories = formData.getAll("categories") as Database["public"]["Enums"]["signal_label"][];

  if (!menor_id || categories.length === 0) {
    return { error: "Selecciona un menor y al menos una categoría" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "tutor") return { error: "Forbidden" };

  const { error } = await supabase.from("pacts").insert({
    family_id: profile.family_id,
    tutor_id: userData.user.id,
    menor_id,
    trusted_adult_id: trusted_adult_id || null,
    monitored_categories: categories,
    status: "pending",
    signed_by_tutor_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/tutor");
  return { success: true };
}
