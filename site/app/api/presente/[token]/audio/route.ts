import { NextResponse } from "next/server";
import { findAdminPresentShare, recordAdminPresentAccess } from "@/lib/delivery/admin-present-share";
import { hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAudioBucket } from "@/lib/supabase/env";
import { hasConfirmedDeliveryPayment } from "@/lib/payment/confirmed-delivery";

const SIGNED_URL_SECONDS = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const tokenHash = await hashShareToken((await context.params).token);
  if (!tokenHash) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: paidAccess, error: accessError } = await admin.rpc(
      "get_shared_present_audio",
      { target_token_hash: tokenHash },
    );
    const confirmedPaidAccess = !accessError && isAudioAccess(paidAccess) && paidAccess.found &&
      await hasConfirmedDeliveryPayment(admin, paidAccess.order_id, paidAccess.version_id)
      ? paidAccess
      : null;
    const adminAccess = confirmedPaidAccess ? null : await findAdminPresentShare(admin, tokenHash);
    if (!confirmedPaidAccess && !adminAccess) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const objectKey = confirmedPaidAccess?.object_key ?? adminAccess?.objectKey;
    if (!objectKey) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const download = new URL(request.url).searchParams.get("mode") === "download";
    const { data, error } = await admin.storage
      .from(getSupabaseAudioBucket())
      .createSignedUrl(objectKey, SIGNED_URL_SECONDS, download ? { download: true } : undefined);
    if (error || !data) throw error ?? new Error("signed_url_failed");
    if (confirmedPaidAccess) {
      await admin.rpc("record_delivery_access", {
        target_delivery_id: confirmedPaidAccess.delivery_id,
      });
    } else if (adminAccess) {
      await recordAdminPresentAccess(admin, adminAccess.shareId);
    }
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
  order_id: string;
  version_id: string;
  object_key: string;
} {
  if (!value || typeof value !== "object") return false;
  const access = value as Record<string, unknown>;
  return typeof access.found === "boolean" &&
    typeof access.delivery_id === "string" &&
    typeof access.order_id === "string" &&
    typeof access.version_id === "string" &&
    typeof access.object_key === "string";
}
