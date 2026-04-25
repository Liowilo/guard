"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signPactAction(pactId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("pacts")
    .update({
      status: "signed",
      signed_by_menor_at: new Date().toISOString(),
    })
    .eq("id", pactId)
    .eq("menor_id", userData.user.id);

  if (error) return { error: error.message };
  revalidatePath("/menor");
  return { success: true };
}

export async function triggerSosAction(pactId: string, trustedAdultId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "No autenticado" };

  const { error } = await supabase.from("sos_events").insert({
    triggered_by: userData.user.id,
    pact_id: pactId,
    trusted_adult_id: trustedAdultId,
  });

  if (error) return { error: error.message };
  revalidatePath("/menor");
  return { success: true };
}
