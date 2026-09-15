import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAudioBucket } from "@/lib/supabase/env";

const SIGNED_URL_SECONDS = 5 * 60;
const idSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: item, error: itemError } = await admin
      .from("home_showcase")
      .select("version_id")
      .eq("order_id", orderId.data)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const objectKey = `orders/${orderId.data}/versions/${item.version_id}/full.mp3`;
    const { data: version, error: versionError } = await admin
      .from("music_versions")
      .select("full_audio_object_key")
      .eq("id", item.version_id)
      .eq("order_id", orderId.data)
      .eq("status", "ready")
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version || version.full_audio_object_key !== objectKey) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from(getSupabaseAudioBucket())
      .createSignedUrl(objectKey, SIGNED_URL_SECONDS);
    if (error || !data) throw error ?? new Error("signed_url_failed");

    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "public, max-age=120", "X-Robots-Tag": "noindex" },
    });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
