import { NextResponse } from "next/server";
import { getPaymentSecret, PAYMENT_SECRET_NAMES } from "@/lib/admin/secrets";
import { getApplicationSettings } from "@/lib/admin/settings";
import { assertPaymentLiveEnabled } from "@/lib/payment/env";
import { applyVerifiedProviderCharge } from "@/lib/payment/provider-persistence";
import { createConfiguredPixProvider } from "@/lib/payment/providers/configured-provider";
import { parseEfiPixWebhook, verifyEfiWebhookSourceIp, verifyEfiWebhookToken } from "@/lib/payment/providers/efi-webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 65_536;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  try {
    assertPaymentLiveEnabled();
    const admin = createSupabaseAdminClient();
    const terminationMode = process.env.EFI_WEBHOOK_MTLS_TERMINATION?.trim();
    const gatewaySecret = await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiWebhookMtlsGatewaySecret, "EFI_WEBHOOK_MTLS_GATEWAY_SECRET");
    const verifiedByGateway = terminationMode === "gateway" && Boolean(gatewaySecret) &&
      verifyEfiWebhookToken(request.headers.get("x-efi-mtls-gateway-secret"), gatewaySecret ?? "");
    const verifiedDirectly = terminationMode === "direct" &&
      verifyEfiWebhookSourceIp(request.headers.get("x-forwarded-for"));
    if (!verifiedByGateway && !verifiedDirectly) {
      return NextResponse.json({ error: "mtls_not_verified" }, { status: 403 });
    }
    const hmac = new URL(request.url).searchParams.get("hmac");
    if (!verifyEfiWebhookToken(hmac, requiredSecret(await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiWebhookToken, "EFI_WEBHOOK_TOKEN"), "EFI_WEBHOOK_TOKEN"))) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (rawBody.trim().length === 0) {
      return new NextResponse("200", { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const notifications = parseEfiPixWebhook(JSON.parse(rawBody));
    const settings = await getApplicationSettings(admin);
    const provider = await createConfiguredPixProvider(admin, "efi", settings.efiEnvironment);
    let shouldRetry = false;
    for (const notification of notifications) {
      const charge = await provider.getPixCharge(notification.txid);
      const result = await applyVerifiedProviderCharge(
        admin,
        charge,
        `pix:${notification.endToEndId}:${charge.status}`,
        notification.occurredAt,
      );
      if (result.found && charge.status === "pending") shouldRetry = true;
    }
    if (shouldRetry) {
      return NextResponse.json({ error: "payment_still_pending" }, { status: 503 });
    }
    return NextResponse.json({ received: true }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "webhook_unavailable" }, { status: 503 });
  }
}

function requiredSecret(value: string | null, key: string) {
  if (!value) throw new Error(`${key} não configurada.`);
  return value;
}
