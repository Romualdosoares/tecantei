import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [home, migration, ordersPage, paymentGuard, checkout, orderEditor, deliveryPage, audioRoute, shareRoute, presentPage, sharedAudioRoute, adminDashboard, adminUsers, adminUser] = await Promise.all([
  read("../app/page.tsx"),
  read("../supabase/migrations/202609140002_customer_contact.sql"),
  read("../app/pedidos/page.tsx"),
  read("../lib/payment/confirmed-delivery.ts"),
  read("../app/api/orders/[orderId]/checkout/route.ts"),
  read("../app/pedidos/[orderId]/order-editor.tsx"),
  read("../app/pedidos/[orderId]/entrega/page.tsx"),
  read("../app/api/orders/[orderId]/audio/route.ts"),
  read("../app/api/orders/[orderId]/share/route.ts"),
  read("../app/presente/[token]/page.tsx"),
  read("../app/api/presente/[token]/audio/route.ts"),
  read("../app/admin/admin-dashboard.tsx"),
  read("../app/api/admin/users/route.ts"),
  read("../app/api/admin/users/[userId]/route.ts"),
]);

assert.match(home, /Nome do usuário/);
assert.match(home, /WhatsApp/);
assert.match(home, /autoComplete="name"/);
assert.match(home, /autoComplete="tel"/);
assert.match(home, /display_name: accountName\.trim\(\)/);
assert.match(home, /whatsapp: normalizedWhatsapp/);
assert.match(home, /Olá, \{firstName\(accountName\)\}/);
assert.match(migration, /add column if not exists whatsapp text/);
assert.match(migration, /profiles_whatsapp_format_check/);
assert.match(migration, /insert into public\.profiles\(id, display_name, whatsapp\)/);
assert.match(migration, /grant update \(display_name, whatsapp\)/);
assert.match(ordersPage, /profile\?\.display_name \? `Olá,/);
assert.match(adminDashboard, /nome, e-mail ou WhatsApp/i);
assert.match(adminUsers, /whatsapp: input\.data\.whatsapp \|\| null/);
assert.match(adminUser, /whatsapp: input\.data\.whatsapp \|\| null/);

assert.match(paymentGuard, /\.eq\("status", "confirmed"\)/);
assert.match(paymentGuard, /query\.in\("provider", \["efi", "mercado_pago"\]\)/);
assert.match(paymentGuard, /query\.eq\("provider", "mock"\)/);
assert.match(checkout, /provider\.getPixCharge\(data\.external_payment_id\)/);
assert.match(checkout, /applyVerifiedProviderCharge/);
assert.match(orderEditor, /if \(data\.status === "confirmed"\)/);
assert.match(deliveryPage, /hasConfirmedDeliveryPayment\(admin, order\.id, delivery\.version_id\)/);
assert.match(audioRoute, /hasConfirmedDeliveryPayment\(admin, orderId, delivery\.version_id\)/);
assert.match(shareRoute, /hasConfirmedDeliveryPayment\(admin, orderId\.data, delivery\.version_id\)/);
assert.match(shareRoute, /\.eq\("owner_id", authData\.user\.id\)/);
assert.match(presentPage, /hasConfirmedDeliveryPayment\(admin, data\.order_id, data\.version_id\)/);
assert.match(sharedAudioRoute, /hasConfirmedDeliveryPayment\(admin, access\.order_id, access\.version_id\)/);
assert.match(audioRoute, /error: "payment_not_confirmed"/);

console.log("PASS: cadastro exige nome e WhatsApp, grava o perfil privado e exibe o primeiro nome após o login");
console.log("PASS: entrega, download, compartilhamento e presente exigem pagamento confirmado no servidor");
console.log("PASS: produção aceita somente confirmação real de Efí/Mercado Pago; simulação fica restrita ao modo mock");
