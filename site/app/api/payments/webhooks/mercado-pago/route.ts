import { NextResponse } from "next/server";
import { assertLivePaymentConfiguration, getPaymentProvider } from "@/lib/payment/env";
import { applyVerifiedProviderCharge } from "@/lib/payment/provider-persistence";
import { createConfiguredPixProvider } from "@/lib/payment/providers/configured-provider";
import { verifyMercadoPagoWebhook } from "@/lib/payment/providers/mercado-pago-webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 65_536;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  const payload = parseRecord(rawBody);
  if (!payload) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    assertLivePaymentConfiguration();
    if (getPaymentProvider() !== "mercado_pago") {
      return NextResponse.json({ error: "provider_disabled" }, { status: 404 });
    }
    const dataId = new URL(request.url).searchParams.get("data.id") ?? "";
    const requestId = request.headers.get("x-request-id") ?? "";
    const signature = request.headers.get("x-signature");
    if (!verifyMercadoPagoWebhook(
      { dataId, requestId, signature },
      requiredEnv("MERCADO_PAGO_WEBHOOK_SECRET"),
    )) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    if (payload.type !== "payment" && payload.topic !== "payment") {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const provider = createConfiguredPixProvider();
    const charge = await provider.getPixCharge(dataId);
    const result = await applyVerifiedProviderCharge(
      createSupabaseAdminClient(),
      charge,
      `payment:${charge.externalId}:${charge.status}`,
    );
    if (!result.found) {
      return NextResponse.json({ error: "payment_not_attached" }, { status: 503 });
    }
    return NextResponse.json({ received: true, duplicate: result.duplicate }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "webhook_unavailable" }, { status: 503 });
  }
}

function requiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} não configurada.`);
  return value;
}

function parseRecord(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
