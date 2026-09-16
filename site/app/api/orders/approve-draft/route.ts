import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  requestId: z.string().uuid(),
  occasion: z.string().trim().max(80).optional().transform((value) => value || "Uma homenagem especial"),
  recipient: z.string().trim().min(1).max(120),
  pronunciation: z.string().max(200).default(""),
  story: z.string().min(200).max(4000),
  style: z.string().trim().min(1).max(120),
  voicePreference: z.enum(["masculina", "feminina"]),
  lyrics: z.string().min(100).max(5000),
});

export async function POST(request: Request) {
  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("approve_new_order", {
      request_id: payload.data.requestId,
      order_occasion: payload.data.occasion,
      recipient: payload.data.recipient,
      recipient_pronunciation: payload.data.pronunciation,
      customer_story: payload.data.story,
      music_style: payload.data.style,
      voice_choice: payload.data.voicePreference,
      approved_content: payload.data.lyrics,
    });
    if (error || !data) throw error ?? new Error("order_not_created");

    return NextResponse.json(data, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
