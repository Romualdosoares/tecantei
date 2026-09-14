import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const PREFLIGHT_TARGETS = ["local", "preview", "production"];

const REQUIRED_FILES = [
  "package.json",
  "package-lock.json",
  ".env.example",
  ".gitignore",
  "next.config.ts",
  "proxy.ts",
];

const REQUIRED_MIGRATIONS = [
  "202609110001_initial.sql",
  "202609110002_order_revisions.sql",
  "202609110003_generation_flow.sql",
  "202609110004_payment_foundation.sql",
  "202609110005_delivery_sharing.sql",
  "202609110006_support_console.sql",
  "202609110007_generation_budgets.sql",
  "202609110008_live_pix_payments.sql",
  "202609110009_music_style_and_voice.sql",
  "202609110010_admin_dashboard.sql",
  "202609130001_kie_lyrics_and_vault.sql",
  "202609130002_kie_webhook_secret.sql",
  "202609130003_prepare_single_music_pilot.sql",
  "202609130004_single_music_pilot.sql",
  "202609130005_fix_generation_output_publish.sql",
  "202609140001_financial_settings.sql",
];

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_AUDIO_BUCKET",
  "KIE_API_KEY",
  "KIE_LIVE_LYRICS_ENABLED",
  "KIE_LYRICS_MODEL",
  "KIE_WEBHOOK_HMAC_KEY",
  "KIE_ALLOWED_AUDIO_HOSTS",
  "KIE_MODEL",
  "KIE_GENERATION_MODE",
  "KIE_LIVE_GENERATION_ENABLED",
  "KIE_GENERATION_CREDITS",
  "GENERATION_BUDGET_SCOPE",
  "GENERATION_ACCOUNT_24H_CREDITS",
  "GENERATION_ENVIRONMENT_24H_CREDITS",
  "CRON_SECRET",
  "PAYMENT_MODE",
  "PAYMENT_LIVE_ENABLED",
  "PAYMENT_MOCK_CONFIRMATION_ENABLED",
  "PAYMENT_PROVIDER",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "EFI_ENVIRONMENT",
  "EFI_CLIENT_ID",
  "EFI_CLIENT_SECRET",
  "EFI_PIX_KEY",
  "EFI_CERTIFICATE_P12_BASE64",
  "EFI_CERTIFICATE_PASSPHRASE",
  "EFI_WEBHOOK_TOKEN",
  "EFI_WEBHOOK_MTLS_TERMINATION",
  "EFI_WEBHOOK_MTLS_GATEWAY_SECRET",
  "NEXT_PUBLIC_SITE_URL",
];

const SAFE_DEFAULTS = {
  KIE_LIVE_LYRICS_ENABLED: "false",
  KIE_LYRICS_MODEL: "gpt-5-6-terra",
  KIE_MODEL: "V6",
  KIE_GENERATION_MODE: "mock",
  KIE_LIVE_GENERATION_ENABLED: "false",
  KIE_GENERATION_CREDITS: "12",
  PAYMENT_MODE: "mock",
  PAYMENT_LIVE_ENABLED: "false",
  PAYMENT_MOCK_CONFIRMATION_ENABLED: "false",
  PAYMENT_PROVIDER: "mercado_pago",
  EFI_ENVIRONMENT: "homologation",
  EFI_WEBHOOK_MTLS_TERMINATION: "unconfigured",
  SUPABASE_AUDIO_BUCKET: "te-cantei-audio",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

const PLACEHOLDER = /SUBSTITUA|SEU-PROJETO|exemplo\.com|change[-_]?me/i;
const ALLOWED_PUBLIC_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
]);
const KIE_MODELS = new Set(["V3_5", "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5", "V6", "V6_MINI", "V6_WILD"]);
const KIE_LYRIC_MODELS = new Set(["gpt-5-6-sol", "gpt-5-6-terra", "gpt-5-6-luna", "gpt-6-astra"]);

export function parseEnv(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export async function loadPreflightEnv(rootDir, target, processEnv = process.env) {
  const merged = {};
  const candidates = [".env", ".env.local", `.env.${target}`, `.env.${target}.local`];
  for (const filename of candidates) {
    try {
      Object.assign(merged, parseEnv(await readFile(path.join(rootDir, filename), "utf8")));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return { ...merged, ...processEnv };
}

export async function runPreflight({ rootDir, target = "local", env = {} }) {
  if (!PREFLIGHT_TARGETS.includes(target)) {
    throw new Error(`Alvo inválido: ${target}. Use local, preview ou production.`);
  }

  const checks = [];
  const add = (level, area, message) => checks.push({ level, area, message });
  const value = (key) => String(env[key] ?? SAFE_DEFAULTS[key] ?? "").trim();
  const configured = (key) => {
    const current = value(key);
    return Boolean(current) && !PLACEHOLDER.test(current);
  };

  for (const filename of REQUIRED_FILES) {
    try {
      await access(path.join(rootDir, filename));
      add("pass", "arquivos", `${filename} presente`);
    } catch {
      add("block", "arquivos", `${filename} ausente`);
    }
  }

  const packageJson = await readJson(path.join(rootDir, "package.json"));
  if (packageJson?.engines?.node === ">=22.13.0") {
    add("pass", "runtime", "Node >=22.13.0 está fixado no package.json");
  } else {
    add("block", "runtime", "fixe engines.node como >=22.13.0");
  }

  const gitignore = await readText(path.join(rootDir, ".gitignore"));
  if (/^\.env\*$/m.test(gitignore) && /^!\.env\.example$/m.test(gitignore)) {
    add("pass", "segredos", "arquivos .env são ignorados e .env.example pode ser versionado");
  } else {
    add("block", "segredos", "proteção de arquivos .env no .gitignore está incompleta");
  }

  const example = parseEnv(await readText(path.join(rootDir, ".env.example")));
  const missingExampleKeys = REQUIRED_ENV_KEYS.filter((key) => !(key in example));
  if (missingExampleKeys.length === 0) {
    add("pass", "ambiente", ".env.example documenta todas as variáveis conhecidas");
  } else {
    add("block", "ambiente", `.env.example não documenta: ${missingExampleKeys.join(", ")}`);
  }

  const exposedSecrets = [...new Set([...Object.keys(example), ...Object.keys(env)])]
    .filter((key) => key.startsWith("NEXT_PUBLIC_") && !ALLOWED_PUBLIC_KEYS.has(key))
    .filter((key) => /(SECRET|TOKEN|PRIVATE|SERVICE_ROLE|API_KEY|HMAC|CRON)/i.test(key));
  if (exposedSecrets.length === 0) {
    add("pass", "segredos", "nenhum segredo conhecido usa o prefixo público do Next.js");
  } else {
    add("block", "segredos", `variáveis públicas não autorizadas: ${exposedSecrets.join(", ")}`);
  }

  await checkMigrations(rootDir, add);
  checkModes(target, value, add);

  if (target === "local") {
    checkLocal(value, add);
  } else {
    checkExternalBase(value, configured, add);
    if (target === "preview") checkPreview(value, add);
    if (target === "production") checkProduction(value, configured, add);
  }

  const summary = {
    pass: checks.filter((item) => item.level === "pass").length,
    warn: checks.filter((item) => item.level === "warn").length,
    block: checks.filter((item) => item.level === "block").length,
  };
  return { target, checks, summary, ready: summary.block === 0 };
}

async function checkMigrations(rootDir, add) {
  try {
    const files = (await readdir(path.join(rootDir, "supabase", "migrations")))
      .filter((filename) => filename.endsWith(".sql"))
      .sort();
    const missing = REQUIRED_MIGRATIONS.filter((filename) => !files.includes(filename));
    const prefixes = files.map((filename) => filename.match(/^(\d{12})_[a-z0-9_]+\.sql$/)?.[1]);
    const validNames = prefixes.every(Boolean);
    const uniqueOrder = new Set(prefixes).size === prefixes.length;
    if (missing.length === 0 && validNames && uniqueOrder) {
      add("pass", "migrações", `${files.length} migrações SQL têm nomes únicos e ordem determinística`);
    } else {
      const details = [
        missing.length ? `ausentes: ${missing.join(", ")}` : "",
        !validNames ? "há nome fora do padrão" : "",
        !uniqueOrder ? "há prefixo repetido" : "",
      ].filter(Boolean).join("; ");
      add("block", "migrações", details);
    }
  } catch {
    add("block", "migrações", "diretório supabase/migrations indisponível");
  }
}

function checkModes(target, value, add) {
  add(KIE_LYRIC_MODELS.has(value("KIE_LYRICS_MODEL")) ? "pass" : "block", "letra", KIE_LYRIC_MODELS.has(value("KIE_LYRICS_MODEL")) ? "modelo GPT da Kie.ai é suportado" : "KIE_LYRICS_MODEL não é suportado");

  if (["mock", "live"].includes(value("KIE_GENERATION_MODE"))) {
    add("pass", "Kie.ai", "modo de geração musical é reconhecido");
  } else {
    add("block", "Kie.ai", "KIE_GENERATION_MODE deve ser mock ou live");
  }

  if (["mock", "live"].includes(value("PAYMENT_MODE"))) {
    add("pass", "pagamento", "modo de pagamento é reconhecido");
  } else {
    add("block", "pagamento", "PAYMENT_MODE deve ser mock ou live");
  }

  if (["efi", "mercado_pago"].includes(value("PAYMENT_PROVIDER"))) {
    add("pass", "pagamento", "provedor Pix selecionado é reconhecido");
  } else {
    add("block", "pagamento", "PAYMENT_PROVIDER deve ser efi ou mercado_pago");
  }

  const credits = Number(value("KIE_GENERATION_CREDITS"));
  if (Number.isFinite(credits) && credits > 0 && credits <= 10_000) {
    add("pass", "Kie.ai", "estimativa de créditos é numérica e positiva");
  } else {
    add("block", "Kie.ai", "KIE_GENERATION_CREDITS deve ficar entre 0 e 10.000");
  }

  add(KIE_MODELS.has(value("KIE_MODEL")) ? "pass" : "block", "Kie.ai", KIE_MODELS.has(value("KIE_MODEL")) ? "modelo musical é suportado pelo adaptador" : "KIE_MODEL não é suportado pelo adaptador atual");

  if (target !== "production" && value("KIE_LIVE_GENERATION_ENABLED") === "true") {
    add("block", "Kie.ai", "trava de consumo real não pode estar ativa fora de production");
  }
  if (target !== "production" && value("KIE_LIVE_LYRICS_ENABLED") === "true") {
    add("block", "letra", "trava de uso real do GPT pela Kie.ai não pode estar ativa fora de production");
  }
  if (target !== "production" && value("PAYMENT_LIVE_ENABLED") === "true") {
    add("block", "pagamento", "trava de cobrança real não pode estar ativa fora de production");
  }
}

function checkLocal(value, add) {
  add(value("KIE_LIVE_LYRICS_ENABLED") !== "true" ? "pass" : "block", "letra", value("KIE_LIVE_LYRICS_ENABLED") !== "true" ? "ambiente local não chama o GPT da Kie.ai" : "ambiente local deve manter a letra real desligada");
  if (value("KIE_GENERATION_MODE") === "mock" && value("KIE_LIVE_GENERATION_ENABLED") !== "true") {
    add("pass", "Kie.ai", "ambiente local não pode consumir créditos");
  } else {
    add("block", "Kie.ai", "ambiente local deve usar mock e manter a trava live desligada");
  }
  if (value("PAYMENT_MODE") === "mock" && value("PAYMENT_LIVE_ENABLED") !== "true") {
    add("pass", "pagamento", "ambiente local não pode cobrar");
  } else {
    add("block", "pagamento", "ambiente local deve usar mock e manter cobrança live desligada");
  }
  add("warn", "externo", "Supabase, Kie.ai, pagamento, GitHub e Vercel ainda precisam de validação própria");
}

function checkExternalBase(value, configured, add) {
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
    add(configured(key) ? "pass" : "block", "Supabase", configured(key) ? `${key} configurada` : `${key} ausente ou com placeholder`);
  }

  const siteUrl = parseUrl(value("NEXT_PUBLIC_SITE_URL"));
  add(siteUrl?.protocol === "https:" ? "pass" : "block", "URL", siteUrl?.protocol === "https:" ? "NEXT_PUBLIC_SITE_URL usa HTTPS" : "NEXT_PUBLIC_SITE_URL deve ser uma URL HTTPS externa");

  const supabaseUrl = parseUrl(value("NEXT_PUBLIC_SUPABASE_URL"));
  if (configured("NEXT_PUBLIC_SUPABASE_URL")) {
    add(supabaseUrl?.protocol === "https:" ? "pass" : "block", "Supabase", supabaseUrl?.protocol === "https:" ? "URL do Supabase usa HTTPS" : "URL do Supabase deve usar HTTPS");
  }

  const bucket = value("SUPABASE_AUDIO_BUCKET");
  add(/^[a-z0-9][a-z0-9._-]{2,62}$/.test(bucket) ? "pass" : "block", "Supabase", /^[a-z0-9][a-z0-9._-]{2,62}$/.test(bucket) ? "nome do bucket de áudio é válido" : "SUPABASE_AUDIO_BUCKET tem formato inválido");

  add(value("CRON_SECRET").length >= 24 && !PLACEHOLDER.test(value("CRON_SECRET")) ? "pass" : "block", "segredos", value("CRON_SECRET").length >= 24 && !PLACEHOLDER.test(value("CRON_SECRET")) ? "CRON_SECRET atende ao tamanho mínimo" : "CRON_SECRET precisa ter ao menos 24 caracteres e não pode ser placeholder");
}

function checkPreview(value, add) {
  add(value("KIE_LIVE_LYRICS_ENABLED") !== "true" ? "pass" : "block", "letra", value("KIE_LIVE_LYRICS_ENABLED") !== "true" ? "preview mantém a letra em simulação" : "preview deve manter o GPT real desligado");
  add(value("KIE_GENERATION_MODE") === "mock" ? "pass" : "block", "Kie.ai", value("KIE_GENERATION_MODE") === "mock" ? "preview mantém geração musical simulada" : "preview deve manter KIE_GENERATION_MODE=mock");
  add(value("PAYMENT_MODE") === "mock" ? "pass" : "block", "pagamento", value("PAYMENT_MODE") === "mock" ? "preview mantém pagamento simulado" : "preview deve manter PAYMENT_MODE=mock");
  add(value("GENERATION_BUDGET_SCOPE") === "preview" ? "pass" : "block", "orçamento", value("GENERATION_BUDGET_SCOPE") === "preview" ? "orçamento está isolado no escopo de preview" : "preview exige GENERATION_BUDGET_SCOPE=preview");
  if (value("PAYMENT_MOCK_CONFIRMATION_ENABLED") !== "true") {
    add("warn", "pagamento", "confirmação mock está desligada; o piloto não concluirá a entrega em preview");
  }
  add("warn", "integração", "aplique as migrações e valide Auth, RLS e Storage no projeto Supabase de teste");
}

function checkProduction(value, configured, add) {
  add(value("KIE_LIVE_LYRICS_ENABLED") === "true" ? "pass" : "block", "letra", value("KIE_LIVE_LYRICS_ENABLED") === "true" ? "trava live do GPT pela Kie.ai está ativa" : "production exige KIE_LIVE_LYRICS_ENABLED=true");
  add(value("KIE_GENERATION_MODE") === "live" ? "pass" : "block", "Kie.ai", value("KIE_GENERATION_MODE") === "live" ? "geração musical está em modo live" : "production exige KIE_GENERATION_MODE=live");
  add(value("KIE_LIVE_GENERATION_ENABLED") === "true" ? "pass" : "block", "Kie.ai", value("KIE_LIVE_GENERATION_ENABLED") === "true" ? "trava live da Kie.ai está ativa" : "production exige confirmação explícita da trava live");
  add(configured("KIE_API_KEY") ? "pass" : "warn", "Kie.ai", configured("KIE_API_KEY") ? "KIE_API_KEY configurada no ambiente" : "KIE_API_KEY não está no ambiente; confirme que foi cadastrada no cofre pelo painel");
  add(configured("KIE_WEBHOOK_HMAC_KEY") && value("KIE_WEBHOOK_HMAC_KEY").length >= 32 ? "pass" : "block", "Kie.ai", configured("KIE_WEBHOOK_HMAC_KEY") && value("KIE_WEBHOOK_HMAC_KEY").length >= 32 ? "KIE_WEBHOOK_HMAC_KEY atende ao tamanho mínimo" : "KIE_WEBHOOK_HMAC_KEY precisa ter ao menos 32 caracteres e não pode ser placeholder");
  const hosts = value("KIE_ALLOWED_AUDIO_HOSTS").split(",").map((host) => host.trim()).filter(Boolean);
  const validHosts = configured("KIE_ALLOWED_AUDIO_HOSTS") && hosts.length > 0 && hosts.every((host) => /^[a-z0-9.-]+$/i.test(host) && !host.includes(".."));
  add(validHosts ? "pass" : "block", "Kie.ai", validHosts ? "origens de áudio têm formato de hostname" : "KIE_ALLOWED_AUDIO_HOSTS deve listar apenas hostnames válidos");
  add(value("GENERATION_BUDGET_SCOPE") === "production" ? "pass" : "block", "orçamento", value("GENERATION_BUDGET_SCOPE") === "production" ? "orçamento está isolado no escopo de produção" : "production exige GENERATION_BUDGET_SCOPE=production");
  const accountBudget = Number(value("GENERATION_ACCOUNT_24H_CREDITS"));
  const environmentBudget = Number(value("GENERATION_ENVIRONMENT_24H_CREDITS"));
  const validBudget = Number.isFinite(accountBudget) && accountBudget > 0 && Number.isFinite(environmentBudget) && environmentBudget >= accountBudget;
  add(validBudget ? "pass" : "block", "orçamento", validBudget ? "limites móveis de 24h estão configurados" : "limites de conta e ambiente devem ser positivos, e o ambiente não pode ser menor que uma conta");
  add("warn", "letra", "confirme no painel que o modo Kie.ai GPT ao vivo está selecionado e valide qualidade/custo antes do lançamento");
  add(value("PAYMENT_MODE") === "live" ? "pass" : "block", "pagamento", value("PAYMENT_MODE") === "live" ? "pagamento está marcado como live" : "production exige PAYMENT_MODE=live");
  add(value("PAYMENT_LIVE_ENABLED") === "true" ? "pass" : "block", "pagamento", value("PAYMENT_LIVE_ENABLED") === "true" ? "trava de cobrança live está ativa" : "production exige confirmação explícita da trava de cobrança live");
  checkPaymentProvider(value, configured, add);
  add("warn", "pagamento", "checkout e webhooks estão implementados, mas exigem validação no ambiente oficial do provedor");
  add("block", "piloto", "pedido real ponta a ponta e avaliação humana da música ainda não foram concluídos");
}

function checkPaymentProvider(value, configured, add) {
  const provider = value("PAYMENT_PROVIDER");
  if (provider === "mercado_pago") {
    add(configured("MERCADO_PAGO_ACCESS_TOKEN") ? "pass" : "block", "Mercado Pago", configured("MERCADO_PAGO_ACCESS_TOKEN") ? "Access Token configurado" : "MERCADO_PAGO_ACCESS_TOKEN ausente ou com placeholder");
    const validSecret = configured("MERCADO_PAGO_WEBHOOK_SECRET") && value("MERCADO_PAGO_WEBHOOK_SECRET").length >= 24;
    add(validSecret ? "pass" : "block", "Mercado Pago", validSecret ? "segredo de webhook atende ao tamanho mínimo" : "MERCADO_PAGO_WEBHOOK_SECRET precisa ter ao menos 24 caracteres e não pode ser placeholder");
    return;
  }
  if (provider !== "efi") return;
  add(value("EFI_ENVIRONMENT") === "production" ? "pass" : "block", "Efí", value("EFI_ENVIRONMENT") === "production" ? "API Pix aponta para produção" : "production exige EFI_ENVIRONMENT=production");
  for (const key of ["EFI_CLIENT_ID", "EFI_CLIENT_SECRET", "EFI_PIX_KEY", "EFI_CERTIFICATE_P12_BASE64"]) {
    add(configured(key) ? "pass" : "block", "Efí", configured(key) ? `${key} configurada` : `${key} ausente ou com placeholder`);
  }
  const validToken = configured("EFI_WEBHOOK_TOKEN") && value("EFI_WEBHOOK_TOKEN").length >= 24;
  add(validToken ? "pass" : "block", "Efí", validToken ? "token adicional do webhook atende ao tamanho mínimo" : "EFI_WEBHOOK_TOKEN precisa ter ao menos 24 caracteres e não pode ser placeholder");
  const validGatewaySecret = configured("EFI_WEBHOOK_MTLS_GATEWAY_SECRET") && value("EFI_WEBHOOK_MTLS_GATEWAY_SECRET").length >= 24;
  add(validGatewaySecret ? "pass" : "block", "Efí", validGatewaySecret ? "segredo entre o gateway mTLS e a aplicação está configurado" : "EFI_WEBHOOK_MTLS_GATEWAY_SECRET precisa ter ao menos 24 caracteres e não pode ser placeholder");
  add(value("EFI_WEBHOOK_MTLS_TERMINATION") === "gateway" ? "pass" : "block", "Efí", value("EFI_WEBHOOK_MTLS_TERMINATION") === "gateway" ? "terminação mTLS externa foi declarada" : "produção Efí exige EFI_WEBHOOK_MTLS_TERMINATION=gateway após validação real");
}

async function readText(filename) {
  try {
    return await readFile(filename, "utf8");
  } catch {
    return "";
  }
}

async function readJson(filename) {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch {
    return null;
  }
}

function parseUrl(input) {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}
