import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createShareToken, hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const idSchema = z.string().uuid();
const requestSchema = z.object({
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
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status")
      .eq("id", orderId.data)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || !["paid", "delivered"].includes(order.status)) {
      return NextResponse.json({ error: "order_not_deliverable" }, { status: 409, headers: NO_STORE });
    }

    const { data: delivery, error: deliveryError } = await admin
      .from("deliveries")
      .select("id, dedication")
      .eq("order_id", order.id)
      .maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery) {
      return NextResponse.json({ error: "delivery_not_found" }, { status: 404, headers: NO_STORE });
    }

    const token = createShareToken();
    const tokenHash = await hashShareToken(token);
    if (!tokenHash) throw new Error("share_token_failed");

    const dedication = input.data.dedication || delivery.dedication?.trim() || DEFAULT_DEDICATION;
    const { error: updateError } = await admin
      .from("deliveries")
      .update({
        share_token_hash: tokenHash,
        dedication,
        share_enabled_at: new Date().toISOString(),
        revoked_at: null,
      })
      .eq("id", delivery.id);
    if (updateError) throw updateError;

    const { error: auditError } = await admin.from("admin_audit_log").insert({
      actor_id: identity.id,
      action: "share_delivery_link",
      target_type: "order",
      target_id: order.id,
      reason: input.data.reason,
      metadata: { delivery_id: delivery.id },
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
