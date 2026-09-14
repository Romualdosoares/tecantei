import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8");
const [route, diagnostics, consoleSource, migration] = await Promise.all([
  read("../app/api/support/orders/[orderId]/payments/[paymentIntentId]/reconcile/route.ts"),
  read("../app/api/support/orders/[orderId]/route.ts"),
  read("../app/suporte/support-console.tsx"),
  read("../supabase/migrations/202609110008_live_pix_payments.sql"),
]);

const authIndex = route.indexOf("supabase.auth.getUser");
const supportIndex = route.indexOf('.select("is_support")');
const adminIndex = route.indexOf("createSupabaseAdminClient()");
const auditIndex = route.indexOf('action: "reconcile_payment"');
const queryIndex = route.indexOf("provider.getPixCharge");
const applyIndex = route.indexOf("await applyVerifiedProviderCharge");
assert.ok(authIndex > 0 && supportIndex > authIndex && adminIndex > supportIndex);
assert.ok(auditIndex > adminIndex && queryIndex > auditIndex && applyIndex > queryIndex);
assert.match(route, /\.eq\("id", paymentIntentId\.data\)[\s\S]*?\.eq\("order_id", orderId\.data\)/);
assert.match(route, /createConfiguredPixProvider\(admin, payment\.provider/);
assert.match(route, /reason: z\.string\(\)\.trim\(\)\.min\(12\)\.max\(300\)/);
assert.doesNotMatch(route, /createPixCharge|update\(\{\s*status|rotate_delivery_share/);

assert.match(diagnostics, /external_payment_id/);
assert.match(diagnostics, /expires_at/);
assert.match(consoleSource, /Conciliar no provedor/);
assert.match(consoleSource, /não cria outro Pix, não reembolsa e não libera áudio manualmente/);
assert.match(consoleSource, /reason\.trim\(\)\.length < 12/);

assert.match(migration, /when payment_record\.status = 'confirmed' and incoming_status = 'refunded' then 'refunded'/);
assert.match(migration, /when payment_record\.status in \('failed', 'cancelled'\) then payment_record\.status/);
assert.match(migration, /insert into public\.deliveries[\s\S]*?on conflict \(order_id\) do nothing/);

console.log("PASS: conciliação exige suporte, motivo e auditoria antes de consultar o provedor");
console.log("PASS: ação consulta cobrança existente e não cria Pix, reembolso ou liberação manual");
console.log("PASS: estados terminais e reembolsos não reabrem a entrega automaticamente");
