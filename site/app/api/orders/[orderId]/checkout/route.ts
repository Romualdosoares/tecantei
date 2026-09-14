import { NextResponse } from "next/server";
import { z } from "zod";
import { getApplicationSettings } from "@/lib/admin/settings";
import { assertPaymentLiveEnabled, getPaymentMode } from "@/lib/payment/env";
import { applyVerifiedProviderCharge, attachProviderCharge } from "@/lib/payment/provider-persistence";
import { createConfiguredPixProvider } from "@/lib/payment/providers/configured-provider";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const inputSchema = z.object({
  versionId: z.string().uuid(),
  requestId: z.string().uuid().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
});

type CheckoutResult = {
  payment_intent_id: string;
  version_id: string;
  status: string;
  amount_cents: number;
  currency: string;
  created: boolean;
};

type ProviderCheckoutResult = CheckoutResult & {
  provider: "efi" | "mercado_pago";
  external_payment_id: string | null;
  client_request_id: string;
  expires_at: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const mode = getPaymentMode();
    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    if (mode === "live") {
      assertPaymentLiveEnabled();
      const settings = await getApplicationSettings(admin);
      const providerName = settings.paymentProvider;
      const { data, error } = await supabase.rpc("prepare_provider_checkout", {
        target_order_id: orderId.data,
        target_version_id: input.data.versionId,
        request_id: input.data.requestId,
        selected_provider: providerName,
      });
      if (error || !isProviderCheckoutResult(data)) {
        return NextResponse.json({ error: "checkout_unavailable" }, { status: 409 });
      }
      if (!Number.isInteger(data.amount_cents) || data.amount_cents < 100 || data.amount_cents > 1_000_000 || data.currency !== "BRL") {
        return NextResponse.json({ error: "checkout_amount_mismatch" }, { status: 409 });
      }

      const provider = await createConfiguredPixProvider(admin, providerName, settings.efiEnvironment);
      const charge = data.external_payment_id
        ? await provider.getPixCharge(data.external_payment_id)
        : await provider.createPixCharge({
          amountCents: data.amount_cents,
          externalReference: data.payment_intent_id,
          idempotencyKey: data.client_request_id,
          payerEmail: authData.user.email,
          expirationSeconds: 3_600,
          ...(providerName === "mercado_pago" ? { notificationUrl: mercadoPagoWebhookUrl() } : {}),
        });
      if (charge.amountCents !== data.amount_cents || charge.currency !== data.currency) {
        return NextResponse.json({ error: "checkout_amount_mismatch" }, { status: 409 });
      }
      if (charge.externalReference !== null && charge.externalReference !== data.payment_intent_id) {
        return NextResponse.json({ error: "checkout_reference_mismatch" }, { status: 409 });
      }
      if (!data.external_payment_id) {
        await attachProviderCharge(admin, data.payment_intent_id, charge);
      }
      const applied = await applyVerifiedProviderCharge(
        admin,
        charge,
        `checkout:${charge.externalId}:${charge.status}`,
      );
      if (!applied.found) {
        return NextResponse.json({ error: "payment_not_attached" }, { status: 503 });
      }

      return NextResponse.json({
        paymentIntentId: data.payment_intent_id,
        versionId: data.version_id,
        status: applied.status,
        amountCents: charge.amountCents,
        currency: charge.currency,
        provider: charge.provider,
        pixCopyPaste: charge.qrCode,
        pixQrCodeBase64: charge.qrCodeBase64,
        checkoutUrl: charge.ticketUrl,
        expiresAt: charge.expiresAt,
        mode: "live",
        simulated: false,
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const { data, error } = await supabase.rpc("prepare_mock_checkout", {
      target_order_id: orderId.data,
      target_version_id: input.data.versionId,
      request_id: input.data.requestId,
    });
    if (error || !isCheckoutResult(data)) {
      return NextResponse.json({ error: "checkout_unavailable" }, { status: 409 });
    }

    return NextResponse.json({
      paymentIntentId: data.payment_intent_id,
      versionId: data.version_id,
      status: data.status,
      amountCents: data.amount_cents,
      currency: data.currency,
      mode: "mock",
      simulated: true,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
  }
}

function isProviderCheckoutResult(value: unknown): value is ProviderCheckoutResult {
  if (!isCheckoutResult(value)) return false;
  const result = value as Record<string, unknown>;
  return (result.provider === "efi" || result.provider === "mercado_pago") &&
    (result.external_payment_id === null || typeof result.external_payment_id === "string") &&
    typeof result.client_request_id === "string" &&
    (result.expires_at === null || typeof result.expires_at === "string");
}

function isCheckoutResult(value: unknown): value is CheckoutResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result.payment_intent_id === "string" &&
    typeof result.version_id === "string" &&
    typeof result.status === "string" &&
    typeof result.amount_cents === "number" &&
    typeof result.currency === "string";
}

function mercadoPagoWebhookUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL não configurada.");
  const url = new URL("/api/payments/webhooks/mercado-pago", siteUrl);
  if (url.protocol !== "https:") throw new Error("Webhook do Mercado Pago exige HTTPS.");
  return url.toString();
}
