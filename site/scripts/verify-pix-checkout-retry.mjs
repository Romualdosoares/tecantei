import assert from "node:assert/strict";
import { EfiPixApiError } from "../lib/payment/providers/efi.ts";
import { MercadoPagoApiError } from "../lib/payment/providers/mercado-pago.ts";
import { getPixChargeWithRetry, isRetryablePixLookupError } from "../lib/payment/pix-checkout-retry.ts";

assert.equal(isRetryablePixLookupError(new EfiPixApiError(500)), true);
assert.equal(isRetryablePixLookupError(new EfiPixApiError(429)), true);
assert.equal(isRetryablePixLookupError(new EfiPixApiError(404)), false);
assert.equal(isRetryablePixLookupError(new MercadoPagoApiError(429)), true);
assert.equal(isRetryablePixLookupError(new Error("Timeout na API Efí.")), true);

let attempts = 0;
let creates = 0;
const charge = await getPixChargeWithRetry({
  async getPixCharge(externalId) {
    attempts += 1;
    assert.equal(externalId, "txid-ativo");
    if (attempts === 1) throw new EfiPixApiError(503);
    return { externalId };
  },
  async createPixCharge() {
    creates += 1;
    throw new Error("A consulta não pode criar cobrança.");
  },
}, "txid-ativo", { wait: async () => {} });

assert.equal(attempts, 2);
assert.equal(creates, 0);
assert.deepEqual(charge, { externalId: "txid-ativo" });

await assert.rejects(
  () => getPixChargeWithRetry({
    async getPixCharge() {
      throw new EfiPixApiError(404);
    },
  }, "txid-inexistente", { wait: async () => {} }),
  EfiPixApiError,
);

let failedAttempts = 0;
await assert.rejects(
  () => getPixChargeWithRetry({
    async getPixCharge() {
      failedAttempts += 1;
      throw new MercadoPagoApiError(503);
    },
  }, "pagamento-ativo", { wait: async () => {} }),
  MercadoPagoApiError,
);
assert.equal(failedAttempts, 2);

console.log("PASS: consulta Pix repete uma vez apenas para falhas transitórias e nunca recria cobrança");
