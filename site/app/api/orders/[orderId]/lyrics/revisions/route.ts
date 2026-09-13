import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const payloadSchema = z.object({
  content: z.string().min(100).max(5000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !payload.success) {
    return NextResponse.json({ error: "invalid_lyrics" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("propose_lyrics_revision", {
      target_order_id: orderId.data,
      proposed_content: payload.data.content,
    });
    if (error || !data) throw error ?? new Error("lyrics_not_revised");

    return NextResponse.json(data, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "order_not_editable" }, { status: 409 });
  }
}
