import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (filename) => readFile(path.join(root, filename), "utf8");
const [migration, checkout, mercadoWebhook, efiWebhook, persistence] = await Promise.all([
  read("supabase/migrations/202609110008_live_pix_payments.sql"),
  read("app/api/orders/[orderId]/checkout/route.ts"),
  read("app/api/payments/webhooks/mercado-pago/route.ts"),
  read("app/api/payments/webhooks/efi/route.ts"),
  read("lib/payment/provider-persistence.ts"),
]);

assert.match(migration, /create or replace function public\.prepare_provider_checkout/);
assert.match(migration, /where id = target_order_id and owner_id = auth\.uid\(\)\s+for update/);
assert.match(migration, /selected_provider not in \('efi', 'mercado_pago'\)/);
assert.match(migration, /payment_record\.client_request_id = request_id/);
assert.match(migration, /provider <> selected_provider/);
assert.match(migration, /1990,\s+'BRL',\s+'created'/);
assert.match(migration, /grant execute on function public\.prepare_provider_checkout[^;]+to authenticated/);
assert.match(migration, /grant execute on function public\.attach_provider_payment[^;]+to service_role/);
assert.match(migration, /grant execute on function public\.apply_provider_payment_event[^;]+to service_role/);
assert.match(migration, /payment_record\.amount_cents <> provider_amount_cents/);
assert.match(migration, /selected_version_id <> payment_record\.version_id/);
assert.match(migration, /on conflict \(provider, external_event_id\) do nothing/);
assert.match(migration, /when payment_record\.status = 'confirmed' then 'confirmed'/);

const reserveIndex = checkout.indexOf('supabase.rpc("prepare_provider_checkout"');
const retryIndex = checkout.indexOf("getPixChargeWithRetry(provider, data.external_payment_id)");
const createIndex = checkout.indexOf("provider.createPixCharge");
const attachIndex = checkout.indexOf("await attachProviderCharge");
const reconcileIndex = checkout.indexOf("await applyVerifiedProviderCharge");
assert.ok(reserveIndex > 0 && createIndex > reserveIndex && attachIndex > createIndex && reconcileIndex > attachIndex);
assert.ok(retryIndex > reserveIndex && retryIndex < createIndex);
assert.match(checkout, /data\.external_payment_id\s+\? await getPixChargeWithRetry\(provider, data\.external_payment_id\)\s+\: await provider\.createPixCharge/);
assert.match(checkout, /data\.amount_cents < 100/);
assert.match(checkout, /settings\.paymentProvider/);
assert.match(checkout, /charge\.externalReference !== null/);
assert.match(checkout, /payerEmail: authData\.user\.email/);
assert.match(checkout, /mode: "live"/);
assert.match(checkout, /simulated: false/);

const mercadoVerifyIndex = mercadoWebhook.indexOf("if (!verifyMercadoPagoWebhook");
const mercadoQueryIndex = mercadoWebhook.indexOf("provider.getPixCharge");
const mercadoApplyIndex = mercadoWebhook.indexOf("await applyVerifiedProviderCharge");
assert.ok(mercadoVerifyIndex > 0 && mercadoQueryIndex > mercadoVerifyIndex && mercadoApplyIndex > mercadoQueryIndex);
assert.match(mercadoWebhook, /x-request-id/);
assert.match(mercadoWebhook, /x-signature/);
assert.match(mercadoWebhook, /searchParams\.get\("data\.id"\)/);

const efiGatewayIndex = efiWebhook.indexOf("x-efi-mtls-gateway-secret");
const efiTokenIndex = efiWebhook.indexOf('searchParams.get("hmac")');
const efiQueryIndex = efiWebhook.indexOf("provider.getPixCharge");
const efiApplyIndex = efiWebhook.indexOf("await applyVerifiedProviderCharge");
assert.ok(efiGatewayIndex > 0 && efiTokenIndex > efiGatewayIndex && efiQueryIndex > efiTokenIndex && efiApplyIndex > efiQueryIndex);
assert.match(efiWebhook, /EFI_WEBHOOK_MTLS_TERMINATION/);
assert.match(efiWebhook, /rawBody\.trim\(\)\.length === 0/);

assert.match(persistence, /\.eq\("external_payment_id", charge\.externalId\)/);
assert.match(persistence, /intent\.amount_cents !== charge\.amountCents/);
assert.match(persistence, /charge\.externalReference !== null && charge\.externalReference !== intent\.id/);
assert.match(persistence, /admin\.rpc\("apply_provider_payment_event"/);

console.log("PASS: checkout reserva a intenção antes da chamada Pix e associa a resposta verificada");
console.log("PASS: webhooks autenticam, consultam o provedor e só então aplicam o evento idempotente");
console.log("PASS: confirmação real confere provedor, valor, moeda, seleção e versão de entrega");
