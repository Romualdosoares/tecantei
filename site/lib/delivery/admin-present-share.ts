import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminPresentShare = {
  shareId: string;
  orderId: string;
  versionId: string;
  recipientName: string;
  title: string;
  durationSeconds: number | null;
  dedication: string;
  objectKey: string;
};

export async function findAdminPresentShare(
  admin: SupabaseClient,
  tokenHash: string,
): Promise<AdminPresentShare | null> {
  const { data: share, error: shareError } = await admin
    .from("admin_present_shares")
    .select("id, order_id, version_id, dedication")
    .eq("share_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (shareError || !share) return null;

  const [{ data: order, error: orderError }, { data: version, error: versionError }] = await Promise.all([
    admin.from("orders").select("id, recipient_name").eq("id", share.order_id).maybeSingle(),
    admin
      .from("music_versions")
      .select("id, order_id, status, title, duration_seconds, full_audio_object_key")
      .eq("id", share.version_id)
      .eq("order_id", share.order_id)
      .maybeSingle(),
  ]);
  if (orderError || versionError || !order || !version || version.status !== "ready") return null;

  const expectedKey = `orders/${share.order_id}/versions/${share.version_id}/full.mp3`;
  if (version.full_audio_object_key !== expectedKey) return null;

  return {
    shareId: share.id,
    orderId: share.order_id,
    versionId: share.version_id,
    recipientName: order.recipient_name,
    title: version.title?.trim() || "Sua música personalizada",
    durationSeconds: version.duration_seconds,
    dedication: share.dedication,
    objectKey: expectedKey,
  };
}

export async function recordAdminPresentAccess(admin: SupabaseClient, shareId: string) {
  await admin
    .from("admin_present_shares")
    .update({ first_accessed_at: new Date().toISOString() })
    .eq("id", shareId)
    .is("first_accessed_at", null);
}
