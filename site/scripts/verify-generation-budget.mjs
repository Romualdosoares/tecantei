import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getGenerationBudgetConfig } from "../lib/music/generation-budget.ts";

assert.deepEqual(getGenerationBudgetConfig({}, "mock"), {
  scope: "local",
  account24hCreditsMillis: 0,
  environment24hCreditsMillis: 0,
});
assert.deepEqual(getGenerationBudgetConfig({
  GENERATION_BUDGET_SCOPE: "production",
  GENERATION_ACCOUNT_24H_CREDITS: "24",
  GENERATION_ENVIRONMENT_24H_CREDITS: "120.5",
}, "live"), {
  scope: "production",
  account24hCreditsMillis: 24_000,
  environment24hCreditsMillis: 120_500,
});
assert.throws(() => getGenerationBudgetConfig({}, "live"), /número positivo/);
assert.throws(() => getGenerationBudgetConfig({
  GENERATION_BUDGET_SCOPE: "production",
  GENERATION_ACCOUNT_24H_CREDITS: "0.0001",
  GENERATION_ENVIRONMENT_24H_CREDITS: "1",
}, "live"), /pelo menos 0,001/);
assert.throws(() => getGenerationBudgetConfig({
  GENERATION_BUDGET_SCOPE: "production",
  GENERATION_ACCOUNT_24H_CREDITS: "100",
  GENERATION_ENVIRONMENT_24H_CREDITS: "50",
}, "live"), /não pode ser menor/);
assert.throws(() => getGenerationBudgetConfig({ GENERATION_BUDGET_SCOPE: "Produção inválida" }, "mock"), /sem espaços/);

const [migration, generationRoute, adjustmentRoute, envExample, home, orderEditor] = await Promise.all([
  readFile(new URL("../supabase/migrations/202609110007_generation_budgets.sql", import.meta.url), "utf8"),
  readFile(new URL("../app/api/orders/[orderId]/generation/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/orders/[orderId]/adjustment/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../.env.example", import.meta.url), "utf8"),
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/pedidos/[orderId]/order-editor.tsx", import.meta.url), "utf8"),
]);

for (const fragment of [
  "budget_owner_id uuid",
  "reserved_credits_millis bigint",
  "budget_status in ('reserved','committed','released')",
  "reserve_budgeted_original_generation",
  "reserve_budgeted_adjustment_generation",
  "environment_generation_budget_exceeded",
  "account_generation_budget_exceeded",
  "now() - interval '24 hours'",
  "pg_advisory_xact_lock",
  "reserved_credits_mismatch",
  "then budget_status else 'released' end",
]) assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

assert.match(migration, /revoke all on function public\.reserve_original_generation[\s\S]+from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.reserve_budgeted_original_generation[\s\S]+to service_role/);
assert.match(migration, /grant execute on function public\.reserve_budgeted_adjustment_generation[\s\S]+to service_role/);
assert.ok((migration.match(/pg_advisory_xact_lock/g) ?? []).length >= 4);
assert.ok(migration.indexOf("where request_key = logical_key") < migration.indexOf("generation-budget-env:"), "idempotência deve ser consultada antes de consumir orçamento");

for (const route of [generationRoute, adjustmentRoute]) {
  assert.match(route, /requireGenerationBudgetConfig\(mode\)/);
  assert.match(route, /requested_credits_millis: estimatedCreditsMillis/);
  assert.match(route, /generation_limit_reached/);
  assert.match(route, /status: 429/);
  assert.ok(route.indexOf("reserve_budgeted_") < route.indexOf("new KieMusicClient"), "orçamento deve ser reservado antes da chamada paga");
}
assert.match(generationRoute, /admin\.rpc\([\s\S]*?reserve_budgeted_original_generation/);
assert.match(adjustmentRoute, /admin\.rpc\([\s\S]*?reserve_budgeted_adjustment_generation/);
assert.match(envExample, /GENERATION_BUDGET_SCOPE=local/);
assert.match(envExample, /GENERATION_ACCOUNT_24H_CREDITS=SUBSTITUA_NO_LIVE/);
assert.match(envExample, /GENERATION_ENVIRONMENT_24H_CREDITS=SUBSTITUA_NO_LIVE/);
assert.match(home, /limite temporário de criações foi atingido/);
assert.match(orderEditor, /Seu ajuste continua disponível/);

console.log("PASS: limites de conta e ambiente são reservados em uma transação antes da chamada paga");
console.log("PASS: repetição idempotente não consome orçamento e falha conhecida libera a reserva");
