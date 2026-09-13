import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, runPreflight } from "./preflight-lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = await runPreflight({ rootDir, target: "local", env: {} });
assert.equal(local.ready, true);
assert.equal(local.summary.block, 0);
assert.ok(local.checks.some((check) => check.area === "migrações" && check.level === "pass"));
assert.ok(local.checks.some((check) => check.area === "segredos" && check.level === "pass"));

const preview = await runPreflight({ rootDir, target: "preview", env: {} });
assert.equal(preview.ready, false);
assert.ok(preview.checks.some((check) => check.message.includes("NEXT_PUBLIC_SUPABASE_URL") && check.level === "block"));

const leakedSecret = await runPreflight({ rootDir, target: "local", env: { NEXT_PUBLIC_KIE_API_KEY: "não-deveria-ser-público" } });
assert.equal(leakedSecret.ready, false);
assert.ok(leakedSecret.checks.some((check) => check.message.includes("NEXT_PUBLIC_KIE_API_KEY") && check.level === "block"));

const production = await runPreflight({
  rootDir,
  target: "production",
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_valor-seguro-de-teste",
    SUPABASE_SECRET_KEY: "sb_secret_valor-seguro-de-teste",
    SUPABASE_AUDIO_BUCKET: "te-cantei-audio",
    NEXT_PUBLIC_SITE_URL: "https://te-cantei.invalid",
    CRON_SECRET: "segredo-de-teste-com-mais-de-24-caracteres",
    KIE_LIVE_LYRICS_ENABLED: "true",
    KIE_LYRICS_MODEL: "gpt-5-6-terra",
    KIE_GENERATION_MODE: "live",
    KIE_LIVE_GENERATION_ENABLED: "true",
    KIE_GENERATION_CREDITS: "12",
    GENERATION_BUDGET_SCOPE: "production",
    GENERATION_ACCOUNT_24H_CREDITS: "24",
    GENERATION_ENVIRONMENT_24H_CREDITS: "120",
    KIE_WEBHOOK_HMAC_KEY: "hmac-kie-de-teste-com-tamanho-suficiente",
    KIE_ALLOWED_AUDIO_HOSTS: "cdn.kie.ai",
    PAYMENT_MODE: "mock",
    PAYMENT_PROVIDER: "mercado_pago",
  },
});
assert.equal(production.ready, false);
assert.ok(production.checks.some((check) => check.message.includes("cadastrada no cofre pelo painel") && check.level === "warn"));
assert.ok(production.checks.some((check) => check.message.includes("ambiente oficial do provedor") && check.level === "warn"));
assert.ok(production.checks.some((check) => check.message.includes("MERCADO_PAGO_ACCESS_TOKEN") && check.level === "block"));
assert.doesNotMatch(JSON.stringify(production.checks), /segredo-de-teste|sb_secret_valor/);

assert.deepEqual(parseEnv("A=1\nB='dois'\n# comentário\nC=três=partes\n"), { A: "1", B: "dois", C: "três=partes" });

console.log("PASS: preflight local aceita simulações seguras sem exigir credenciais");
console.log("PASS: preview e produção bloqueiam configuração incompleta sem revelar segredos");
