import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const payloadSchema = z.object({ proposedLyricId: z.string().uuid() });

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !payload.success) {
    return NextResponse.json({ error: "invalid_approval" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("approve_latest_lyrics", {
      target_order_id: orderId.data,
      target_proposed_lyric_id: payload.data.proposedLyricId,
    });
    if (error || !data) throw error ?? new Error("lyrics_not_approved");

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "latest_proposal_required" }, { status: 409 });
  }
}
