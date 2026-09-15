import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createShareToken, hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const idSchema = z.string().uuid();
const requestSchema = z.object({
  versionId: z.string().uuid(),
  dedication: z.string().trim().max(500).default(""),
  reason: z.string().trim().min(8).max(300),
});

const DEFAULT_DEDICATION = "Uma música criada especialmente para você, com carinho.";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const identity = await getAdminIdentity();
    if (!identity) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const admin = createSupabaseAdminClient();
    const expectedKey = `orders/${orderId.data}/versions/${input.data.versionId}/full.mp3`;
    const { data: version, error: versionError } = await admin
      .from("music_versions")
      .select("id, status, full_audio_object_key")
      .eq("id", input.data.versionId)
      .eq("order_id", orderId.data)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version || version.status !== "ready" || version.full_audio_object_key !== expectedKey) {
      return NextResponse.json({ error: "version_not_ready" }, { status: 409, headers: NO_STORE });
    }

    const token = createShareToken();
    const tokenHash = await hashShareToken(token);
    if (!tokenHash) throw new Error("share_token_failed");

    const dedication = input.data.dedication || DEFAULT_DEDICATION;
    const { data: share, error: shareError } = await admin
      .from("admin_present_shares")
      .upsert({
        order_id: orderId.data,
        version_id: version.id,
        share_token_hash: tokenHash,
        dedication,
        created_by: identity.id,
        updated_at: new Date().toISOString(),
        first_accessed_at: null,
        revoked_at: null,
      }, { onConflict: "order_id" })
      .select("id")
      .single();
    if (shareError || !share) throw shareError ?? new Error("share_upsert_failed");

    const { error: auditError } = await admin.from("admin_audit_log").insert({
      actor_id: identity.id,
      action: "share_generated_music_link",
      target_type: "music_version",
      target_id: version.id,
      reason: input.data.reason,
      metadata: { order_id: orderId.data, admin_present_share_id: share.id },
    });
    if (auditError) throw auditError;

    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const origin = configuredOrigin || new URL(request.url).origin;
    const shareUrl = new URL(`/presente/${token}`, origin).toString();
    return NextResponse.json({ shareUrl }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "share_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
