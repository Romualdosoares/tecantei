import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAudioBucket } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const SIGNED_URL_SECONDS = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string; versionId: string }> },
) {
  const parsed = idSchema.safeParse((await context.params).orderId);
  const versionParsed = idSchema.safeParse((await context.params).versionId);
  if (!parsed.success || !versionParsed.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const orderId = parsed.data;
  const versionId = versionParsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, preview_expires_at")
      .eq("id", orderId)
      .eq("owner_id", authData.user.id)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!order.preview_expires_at || Date.parse(order.preview_expires_at) <= Date.now()) {
      return NextResponse.json({ error: "preview_expired" }, { status: 410 });
    }

    const { data: version } = await supabase
      .from("music_versions")
      .select("preview_object_key")
      .eq("id", versionId)
      .eq("order_id", orderId)
      .eq("status", "ready")
      .maybeSingle();
    const expectedKey = `orders/${orderId}/versions/${versionId}/preview.mp3`;
    if (!version || version.preview_object_key !== expectedKey) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(getSupabaseAudioBucket())
      .createSignedUrl(expectedKey, SIGNED_URL_SECONDS);
    if (error || !data) throw error ?? new Error("signed_url_failed");

    return NextResponse.json(
      { url: data.signedUrl, expiresIn: SIGNED_URL_SECONDS },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
