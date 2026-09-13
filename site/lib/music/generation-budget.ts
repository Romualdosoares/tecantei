export type GenerationBudgetConfig = {
  scope: string;
  account24hCreditsMillis: number;
  environment24hCreditsMillis: number;
};

export function getGenerationBudgetConfig(
  env: Record<string, string | undefined>,
  mode: "mock" | "live",
): GenerationBudgetConfig {
  const scope = env.GENERATION_BUDGET_SCOPE?.trim() || "local";
  if (!/^[a-z][a-z0-9_-]{1,31}$/.test(scope)) {
    throw new Error("GENERATION_BUDGET_SCOPE deve identificar o ambiente sem espaços.");
  }

  if (mode === "mock") {
    return { scope, account24hCreditsMillis: 0, environment24hCreditsMillis: 0 };
  }

  const account24hCreditsMillis = parseCredits(env.GENERATION_ACCOUNT_24H_CREDITS, "GENERATION_ACCOUNT_24H_CREDITS");
  const environment24hCreditsMillis = parseCredits(env.GENERATION_ENVIRONMENT_24H_CREDITS, "GENERATION_ENVIRONMENT_24H_CREDITS");
  if (environment24hCreditsMillis < account24hCreditsMillis) {
    throw new Error("O orçamento do ambiente não pode ser menor que o limite de uma conta.");
  }
  return { scope, account24hCreditsMillis, environment24hCreditsMillis };
}

function parseCredits(raw: string | undefined, name: string) {
  const credits = Number(raw?.trim());
  if (!Number.isFinite(credits) || credits <= 0 || credits > 1_000_000) {
    throw new Error(`${name} deve ser um número positivo de créditos.`);
  }
  const creditsMillis = Math.round(credits * 1_000);
  if (creditsMillis <= 0) {
    throw new Error(`${name} deve reservar pelo menos 0,001 crédito.`);
  }
  return creditsMillis;
}
