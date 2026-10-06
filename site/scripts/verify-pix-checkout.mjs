import assert from "node:assert/strict";
import { register } from "node:module";

// Executa a rota real e a persistência real; somente rede, sessão e banco são simulados.
const routeUrl = new URL("../app/api/orders/[orderId]/checkout/route.ts", import.meta.url).href;
const persistenceUrl = new URL("../lib/payment/provider-persistence.ts", import.meta.url).href;
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const aliases = {
  "next/server": moduleUrl("export const NextResponse = { json: (body, init) => Response.json(body, init) };"),
  "@/lib/admin/settings": moduleUrl("export async function getApplicationSettings() { return { paymentProvider: 'efi', efiEnvironment: 'production' }; }"),
  "@/lib/payment/env": moduleUrl("export function getPaymentMode() { return 'live'; } export function assertPaymentLiveEnabled() {}"),
  "@/lib/payment/pix-checkout-retry": moduleUrl("export function getPixChargeWithRetry(provider, id) { return provider.getPixCharge(id); }"),
  "@/lib/payment/provider-persistence": persistenceUrl,
  "@/lib/payment/providers/configured-provider": moduleUrl("export async function createConfiguredPixProvider() { return globalThis.__pixCheckoutTest.provider; }"),
  "@/lib/supabase/admin": moduleUrl("export function createSupabaseAdminClient() { return globalThis.__pixCheckoutTest.admin; }"),
  "@/lib/supabase/server": moduleUrl("export async function createSupabaseServerClient() { return globalThis.__pixCheckoutTest.server; }"),
};
register(moduleUrl(`
  let fixture;
  export function initialize(data) { fixture = data; }
  export function resolve(specifier, context, next) {
    if (decodeURIComponent(context.parentURL ?? '') === decodeURIComponent(fixture.routeUrl) && fixture.aliases[specifier]) {
      return { url: fixture.aliases[specifier], shortCircuit: true };
    }
    if (decodeURIComponent(context.parentURL ?? '') === decodeURIComponent(fixture.persistenceUrl) && specifier === 'server-only') {
      return { url: 'data:text/javascript,export {};', shortCircuit: true };
    }
    return next(specifier, context);
  }
`), { parentURL: import.meta.url, data: { routeUrl, persistenceUrl, aliases } });

const intent = {
  payment_intent_id: "f6f077b9-3f86-44df-86ef-c45510bb3333",
  version_id: "ea137c9d-38be-4180-8251-afc2a2a61111",
  provider: "efi", external_payment_id: null,
  client_request_id: "14443333-2222-4111-8111-999999999999",
  status: "created", amount_cents: 1990, currency: "BRL", expires_at: null, created: true,
};
const charge = {
  provider: "efi", externalId: intent.client_request_id.replaceAll("-", ""),
  externalReference: intent.payment_intent_id, amountCents: 1990, currency: "BRL", status: "pending",
  qrCode: "pix-copia-cola-teste", qrCodeBase64: "imagem-teste", ticketUrl: null, expiresAt: null,
};
const events = new Map();
let creates = 0;
let queries = 0;
let lookupReference = null;
const fixture = {
  provider: {
    async createPixCharge(input) {
      creates += 1;
      assert.equal(input.idempotencyKey, intent.client_request_id);
      return charge;
    },
    async getPixCharge(id) {
      queries += 1;
      assert.equal(id, charge.externalId);
      // A consulta Efí normaliza a referência como null, ao contrário da criação.
      return { ...charge, externalReference: lookupReference };
    },
  },
  server: {
    auth: { async getUser() { return { data: { user: { email: "teste@example.com" } }, error: null }; } },
    async rpc(name) { assert.equal(name, "prepare_provider_checkout"); return { data: { ...intent }, error: null }; },
  },
  admin: {
    from(name) {
      assert.equal(name, "payment_intents");
      return {
        select() { return this; }, eq() { return this; },
        async maybeSingle() { return { data: { id: intent.payment_intent_id, amount_cents: 1990, currency: "BRL" }, error: null }; },
      };
    },
    async rpc(name, input) {
      if (name === "attach_provider_payment") {
        intent.external_payment_id = input.target_external_payment_id;
        return { data: { found: true, payment_intent_id: intent.payment_intent_id, status: "pending", external_payment_id: charge.externalId }, error: null };
      }
      assert.equal(name, "apply_provider_payment_event");
      const previous = events.get(input.provider_event_id);
      // Mesmo contrato SQL: um evento repetido com hash diferente é conflito.
      if (previous && previous !== input.event_payload_hash) return { data: null, error: { message: "payment_event_conflict" } };
      events.set(input.provider_event_id, input.event_payload_hash);
      intent.status = "pending";
      return { data: { found: true, duplicate: Boolean(previous), status: "pending" }, error: null };
    },
  },
};
globalThis.__pixCheckoutTest = fixture;
try {
  const { POST } = await import(routeUrl);
  const checkout = () => POST(new Request("https://teste.example/api/checkout", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionId: intent.version_id, requestId: intent.client_request_id }),
  }), { params: Promise.resolve({ orderId: "48c33333-eeee-4444-aaaa-666666666666" }) });
  assert.equal((await checkout()).status, 200);
  const reopened = await checkout();
  assert.equal(reopened.status, 200, "Reabrir cobrança Efí deve preservar o evento já validado.");
  assert.equal((await reopened.json()).pixCopyPaste, charge.qrCode);
  assert.equal(creates, 1, "Reabertura não pode criar outra cobrança.");
  assert.equal(queries, 1);
  assert.equal(events.size, 1);
  lookupReference = "outro-pedido";
  assert.equal((await checkout()).status, 409, "Referência divergente continua bloqueada.");
  assert.equal(events.size, 1);
  console.log("PASS: rota Pix cria uma vez, reabre cobrança Efí sem conflito e bloqueia referência divergente");
} finally {
  delete globalThis.__pixCheckoutTest;
}
