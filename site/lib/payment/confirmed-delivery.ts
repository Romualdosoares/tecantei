import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPaymentMode } from "./env";

export async function hasConfirmedDeliveryPayment(
  admin: SupabaseClient,
  orderId: string,
  versionId: string,
) {
  let query = admin
    .from("payment_intents")
    .select("id")
    .eq("order_id", orderId)
    .eq("version_id", versionId)
    .eq("status", "confirmed");

  query = getPaymentMode() === "live"
    ? query.in("provider", ["efi", "mercado_pago"])
    : query.eq("provider", "mock");

  const { data, error } = await query.limit(1).maybeSingle();
  return !error && Boolean(data?.id);
}
