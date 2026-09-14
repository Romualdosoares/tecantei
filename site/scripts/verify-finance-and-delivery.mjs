import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, financeSettings, financeSecrets, storefrontConfig, priceProvider, layout, adminDashboard, checkout, orderEditor, deliveryPage, deliveryExperience, audioRoute, efiProvider] = await Promise.all([
  read("../supabase/migrations/202609140001_financial_settings.sql"),
  read("../app/api/admin/finance/settings/route.ts"),
  read("../app/api/admin/finance/secrets/route.ts"),
  read("../app/api/storefront/config/route.ts"),
  read("../components/storefront-price-provider.tsx"),
  read("../app/layout.tsx"),
  read("../app/admin/admin-dashboard.tsx"),
  read("../app/api/orders/[orderId]/checkout/route.ts"),
  read("../app/pedidos/[orderId]/order-editor.tsx"),
  read("../app/pedidos/[orderId]/entrega/page.tsx"),
  read("../app/pedidos/[orderId]/entrega/delivery-experience.tsx"),
  read("../app/api/orders/[orderId]/audio/route.ts"),
  read("../lib/payment/providers/efi.ts"),
]);

assert.match(migration, /product_price_cents integer not null default 1990/);
assert.match(migration, /payment_provider text not null default 'mercado_pago'/);
assert.match(migration, /before insert on public\.payment_intents/);
assert.match(migration, /new\.amount_cents := current_price/);
for (const name of ["mercado_pago_access_token", "mercado_pago_webhook_secret", "efi_client_id", "efi_client_secret", "efi_pix_key", "efi_certificate_p12_base64", "efi_webhook_token", "efi_webhook_mtls_gateway_secret"]) assert.match(migration, new RegExp(name));
assert.match(financeSettings, /getAdminIdentity\(\)/);
assert.match(financeSettings, /product_price_cents/);
assert.match(financeSettings, /writeAudit/);
assert.match(financeSecrets, /getAdminIdentity\(\)/);
assert.match(financeSecrets, /putPaymentSecret/);
assert.doesNotMatch(financeSecrets, /NextResponse\.json\([^\n]*(?:accessToken|clientSecret|webhookSecret|certificateP12Base64)/);
assert.match(storefrontConfig, /productPriceCents: settings\.productPriceCents/);
assert.match(priceProvider, /setInterval\(\(\) => void refreshPrice\(\), 15_000\)/);
assert.match(layout, /<StorefrontPriceProvider>/);
assert.match(adminDashboard, /value: "finance", label: "Financeiro"/);
assert.match(adminDashboard, /Valor da música \(R\$\)/);
assert.match(adminDashboard, /API Pix · Mercado Pago/);
assert.match(adminDashboard, /API Pix · Efí Bank/);
assert.match(checkout, /settings\.paymentProvider/);
assert.match(orderEditor, /QR Code Pix para pagamento/);
assert.match(orderEditor, /Já paguei — confirmar/);
assert.match(orderEditor, /router\.push\(`\/pedidos\/\$\{order\.id\}\/entrega`\)/);
assert.match(deliveryPage, /order\.status !== "paid" && order\.status !== "delivered"/);
assert.match(deliveryExperience, /Criar página do presente/);
assert.match(deliveryExperience, /Baixar música em MP3/);
assert.match(audioRoute, /searchParams\.get\("mode"\) === "stream"/);
assert.match(efiProvider, /`\/v2\/loc\/\$\{locationId\}\/qrcode`/);
assert.match(efiProvider, /payload\.imagemQrcode/);

console.log("PASS: financeiro controla preço, gateway e segredos sem expor credenciais");
console.log("PASS: checkout Pix mostra QR/copia-e-cola e só redireciona após consulta confirmada");
console.log("PASS: entrega privada permite ouvir, baixar e compartilhar a página do presente");
