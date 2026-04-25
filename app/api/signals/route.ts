import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const SIGNAL_LABELS = new Set([
  "love_bombing",
  "intimacy_escalation",
  "emotional_isolation",
  "deceptive_offer",
  "off_platform_request",
]);

function scoreToRisk(score: number): Database["public"]["Enums"]["risk_level"] {
  if (score >= 0.7) return "alto";
  if (score >= 0.45) return "medio";
  return "bajo";
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // Cliente con el JWT del menor — RLS aplica como ese usuario
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verificar rol
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "menor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Obtener pacto firmado — sin hardcodeo
  const { data: pact } = await supabase
    .from("pacts")
    .select("id, monitored_categories")
    .eq("menor_id", user.id)
    .eq("status", "signed")
    .single();

  if (!pact) {
    return NextResponse.json({ error: "No signed pact found" }, { status: 422 });
  }

  // Validar body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { label, score, platform, detected_at } = body as Record<string, unknown>;

  if (typeof label !== "string" || !SIGNAL_LABELS.has(label)) {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  if (typeof score !== "number" || score < 0 || score > 1) {
    return NextResponse.json({ error: "score must be a number between 0 and 1" }, { status: 400 });
  }

  if (!pact.monitored_categories.includes(label as Database["public"]["Enums"]["signal_label"])) {
    return NextResponse.json({ error: "Label not in monitored categories" }, { status: 400 });
  }

  const { data: signal, error: insertError } = await supabase
    .from("signals")
    .insert({
      pact_id: pact.id,
      menor_id: user.id,
      label: label as Database["public"]["Enums"]["signal_label"],
      score,
      risk_level: scoreToRisk(score),
      platform: typeof platform === "string" ? platform : null,
      detected_at: typeof detected_at === "string" ? detected_at : undefined,
    })
    .select("id, risk_level")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(signal, { status: 201 });
}
