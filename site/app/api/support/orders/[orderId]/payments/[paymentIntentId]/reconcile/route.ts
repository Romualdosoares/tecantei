import { NextResponse } from "next/server";
import { z } from "zod";
import { getApplicationSettings } from "@/lib/admin/settings";
import { assertPaymentLiveEnabled } from "@/lib/payment/env";
import { applyVerifiedProviderCharge } from "@/lib/payment/provider-persistence";
import { createConfiguredPixProvider } from "@/lib/payment/providers/configured-provider";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const idSchema = z.string().uuid();
const inputSchema = z.object({ reason: z.string().trim().min(12).max(300) });
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string; paymentIntentId: string }> },
) {
  const params = await context.params;
  const orderId = idSchema.safeParse(params.orderId);
  const paymentIntentId = idSchema.safeParse(params.paymentIntentId);
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !paymentIntentId.success || !input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401, headers: NO_STORE });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_support")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!profile?.is_support) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const admin = createSupabaseAdminClient();
    const { data: payment, error: paymentError } = await admin
      .from("payment_intents")
      .select("id, order_id, provider, external_payment_id, amount_cents, currency, status, expires_at")
      .eq("id", paymentIntentId.data)
      .eq("order_id", orderId.data)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    if ((payment.provider !== "efi" && payment.provider !== "mercado_pago") || !payment.external_payment_id) {
      return NextResponse.json({ error: "payment_not_reconcilable" }, { status: 409, headers: NO_STORE });
    }

    const { error: auditError } = await admin.from("support_audit_log").insert({
      order_id: orderId.data,
      actor_subject: authData.user.id,
      action: "reconcile_payment",
      reason: input.data.reason,
    });
    if (auditError) throw auditError;

    assertPaymentLiveEnabled();
    const settings = await getApplicationSettings(admin);
    const provider = await createConfiguredPixProvider(admin, payment.provider, settings.efiEnvironment);
    const charge = await provider.getPixCharge(payment.external_payment_id);
    const result = await applyVerifiedProviderCharge(
      admin,
      charge,
      `reconcile:${charge.externalId}:${charge.status}`,
    );
    if (!result.found) throw new Error("payment_not_found_after_provider_query");

    return NextResponse.json({
      reconciled: true,
      duplicate: result.duplicate,
      previousStatus: payment.status,
      providerStatus: charge.status,
      storedStatus: result.status,
      deliveryChangedAutomatically: result.status === "confirmed" && payment.status !== "confirmed",
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "reconciliation_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
