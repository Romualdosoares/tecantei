import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMockPaymentSimulation } from "@/lib/payment/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const inputSchema = z.object({
  paymentIntentId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "failed"]),
});

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
    requireMockPaymentSimulation();
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data: payment } = await supabase
      .from("payment_intents")
      .select("id, order_id, provider")
      .eq("id", input.data.paymentIntentId)
      .eq("order_id", orderId.data)
      .eq("provider", "mock")
      .maybeSingle();
    if (!payment) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const payloadHash = await sha256Hex(JSON.stringify(input.data));
    const deliveryTokenHash = await sha256Hex(crypto.randomUUID());
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("apply_mock_payment_event", {
      target_payment_intent_id: payment.id,
      provider_event_id: input.data.eventId,
      incoming_status: input.data.status,
      event_payload_hash: payloadHash,
      delivery_token_hash: deliveryTokenHash,
    });
    if (error || !isPaymentEventResult(data) || !data.found) {
      return NextResponse.json({ error: "event_not_applied" }, { status: 409 });
    }

    return NextResponse.json({
      status: data.status,
      duplicate: data.duplicate,
      mode: "mock",
      simulated: true,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "event_unavailable" }, { status: 503 });
  }
}

function isPaymentEventResult(value: unknown): value is {
  found: boolean;
  duplicate: boolean;
  status: string;
} {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result.found === "boolean" &&
    typeof result.duplicate === "boolean" &&
    typeof result.status === "string";
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
