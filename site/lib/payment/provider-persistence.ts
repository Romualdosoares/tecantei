import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PixCharge } from "./providers/types";

type PaymentIntentRecord = {
  id: string;
  amount_cents: number;
  currency: string;
};

export async function attachProviderCharge(
  admin: SupabaseClient,
  paymentIntentId: string,
  charge: PixCharge,
) {
  const { data, error } = await admin.rpc("attach_provider_payment", {
    target_payment_intent_id: paymentIntentId,
    selected_provider: charge.provider,
    target_external_payment_id: charge.externalId,
    provider_amount_cents: charge.amountCents,
    provider_currency: charge.currency,
    target_expires_at: charge.expiresAt,
  });
  if (error || !isAttachResult(data) || !data.found) {
    throw new Error("provider_payment_not_attached");
  }
  return data;
}

export async function applyVerifiedProviderCharge(
  admin: SupabaseClient,
  charge: PixCharge,
  providerEventId: string,
  occurredAt: string | null = null,
) {
  if (providerEventId.length < 3 || providerEventId.length > 200) {
    throw new Error("invalid_provider_event_id");
  }
  const { data: rawIntent, error: findError } = await admin
    .from("payment_intents")
    .select("id, amount_cents, currency")
    .eq("provider", charge.provider)
    .eq("external_payment_id", charge.externalId)
    .maybeSingle();
  if (findError) throw new Error("payment_lookup_failed");
  if (!rawIntent) return { found: false, duplicate: false, status: null };

  const intent = rawIntent as PaymentIntentRecord;
  if (intent.amount_cents !== charge.amountCents || intent.currency !== charge.currency) {
    throw new Error("payment_amount_mismatch");
  }
  if (charge.externalReference !== null && charge.externalReference !== intent.id) {
    throw new Error("payment_reference_mismatch");
  }

  const payloadHash = sha256Hex(JSON.stringify({
    provider: charge.provider,
    externalId: charge.externalId,
    externalReference: charge.externalReference,
    amountCents: charge.amountCents,
    currency: charge.currency,
    status: charge.status,
  }));
  const deliveryTokenHash = sha256Hex(randomBytes(32));
  const { data, error } = await admin.rpc("apply_provider_payment_event", {
    selected_provider: charge.provider,
    target_external_payment_id: charge.externalId,
    provider_event_id: providerEventId,
    incoming_status: charge.status,
    provider_amount_cents: charge.amountCents,
    provider_currency: charge.currency,
    event_payload_hash: payloadHash,
    event_occurred_at: occurredAt,
    delivery_token_hash: deliveryTokenHash,
  });
  if (error || !isPaymentEventResult(data)) throw new Error("provider_payment_event_not_applied");
  return data;
}

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isAttachResult(value: unknown): value is {
  found: boolean;
  payment_intent_id: string;
  status: string;
  external_payment_id: string;
} {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return result.found === true &&
    typeof result.payment_intent_id === "string" &&
    typeof result.status === "string" &&
    typeof result.external_payment_id === "string";
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
