"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acknowledgeSOSAction(eventId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "adulto_confianza") {
    return { error: "Forbidden" };
  }

  const { error } = await supabase
    .from("sos_events")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("trusted_adult_id", userData.user.id);

  if (error) return { error: error.message };
  revalidatePath("/confianza");
  return { success: true };
}
