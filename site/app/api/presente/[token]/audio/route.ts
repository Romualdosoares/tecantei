import { NextResponse } from "next/server";
import { hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAudioBucket } from "@/lib/supabase/env";

const SIGNED_URL_SECONDS = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const tokenHash = await hashShareToken((await context.params).token);
  if (!tokenHash) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: access, error: accessError } = await admin.rpc(
      "get_shared_present_audio",
      { target_token_hash: tokenHash },
    );
    if (accessError || !isAudioAccess(access) || !access.found) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from(getSupabaseAudioBucket())
      .createSignedUrl(access.object_key, SIGNED_URL_SECONDS);
    if (error || !data) throw error ?? new Error("signed_url_failed");
    await admin.rpc("record_delivery_access", {
      target_delivery_id: access.delivery_id,
    });
    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
    });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}

function isAudioAccess(value: unknown): value is {
  found: boolean;
  delivery_id: string;
  object_key: string;
} {
  if (!value || typeof value !== "object") return false;
  const access = value as Record<string, unknown>;
  return typeof access.found === "boolean" &&
    typeof access.delivery_id === "string" &&
    typeof access.object_key === "string";
}
