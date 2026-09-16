import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const payloadSchema = z.object({
  occasion: z.string().trim().max(80).optional().transform((value) => value || "Uma homenagem especial"),
  recipient: z.string().trim().min(1).max(120),
  pronunciation: z.string().max(200).default(""),
  story: z.string().min(200).max(4000),
  style: z.string().trim().min(1).max(120),
  voicePreference: z.enum(["masculina", "feminina"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !payload.success) {
    return NextResponse.json({ error: "invalid_briefing" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("revise_order_briefing", {
      target_order_id: orderId.data,
      order_occasion: payload.data.occasion,
      recipient: payload.data.recipient,
      recipient_pronunciation: payload.data.pronunciation,
      customer_story: payload.data.story,
      music_style: payload.data.style,
      voice_choice: payload.data.voicePreference,
    });
    if (error || !data) throw error ?? new Error("briefing_not_revised");

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "order_not_editable" }, { status: 409 });
  }
}
