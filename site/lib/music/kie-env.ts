import "server-only";

import { KIE_MODELS, type KieModel } from "./kie-client";
import { getGenerationBudgetConfig } from "./generation-budget";

export type KieGenerationMode = "mock" | "live";

function value(name: string) {
  return process.env[name]?.trim() || null;
}

export function getKieModel(): KieModel {
  const configured = value("KIE_MODEL") ?? "V6";
  if (!KIE_MODELS.includes(configured as KieModel)) {
    throw new Error(`KIE_MODEL inválido: ${configured}`);
  }
  return configured as KieModel;
}

export function getKieGenerationMode(): KieGenerationMode {
  const configured = value("KIE_GENERATION_MODE") ?? "mock";
  if (configured !== "mock" && configured !== "live") {
    throw new Error("KIE_GENERATION_MODE deve ser mock ou live.");
  }
  return configured;
}

export function getKieEstimatedCreditsMillis() {
  const configured = Number(value("KIE_GENERATION_CREDITS") ?? "12");
  if (!Number.isFinite(configured) || configured <= 0 || configured > 10_000) {
    throw new Error("KIE_GENERATION_CREDITS deve ser um número positivo.");
  }
  return Math.round(configured * 1_000);
}

export function requireGenerationBudgetConfig(mode: KieGenerationMode) {
  return getGenerationBudgetConfig(process.env, mode);
}

export function requireKieAllowedAudioHosts() {
  const configured = value("KIE_ALLOWED_AUDIO_HOSTS");
  if (!configured) {
    throw new Error("KIE_ALLOWED_AUDIO_HOSTS não configurado no servidor.");
  }
  const hosts = configured.split(",").map((host) => host.trim().toLowerCase());
  if (hosts.some((host) => !host || host.includes("/") || host.includes(":"))) {
    throw new Error("KIE_ALLOWED_AUDIO_HOSTS deve conter apenas nomes de host separados por vírgula.");
  }
  return new Set(hosts);
}

export function hasKieAllowedAudioHostsConfigured() {
  return Boolean(value("KIE_ALLOWED_AUDIO_HOSTS"));
}

export function requireCronSecret() {
  const secret = value("CRON_SECRET");
  if (!secret || secret.length < 24) {
    throw new Error("CRON_SECRET deve ter pelo menos 24 caracteres.");
  }
  return secret;
}

export function requireKieLiveConfig(mode: KieGenerationMode = getKieGenerationMode(), storedApiKey?: string | null) {
  if (mode !== "live") {
    throw new Error("A geração Kie.ai não está em modo live.");
  }
  if (value("KIE_LIVE_GENERATION_ENABLED") !== "true") {
    throw new Error("KIE_LIVE_GENERATION_ENABLED precisa ser true para consumir créditos.");
  }

  const apiKey = storedApiKey?.trim() || value("KIE_API_KEY");
  const siteUrl = value("NEXT_PUBLIC_SITE_URL");
  if (!apiKey || !siteUrl) {
    throw new Error("A chave da Kie.ai e NEXT_PUBLIC_SITE_URL são obrigatórias no modo live.");
  }

  const callbackUrl = new URL("/api/kie/callback", siteUrl);
  if (callbackUrl.protocol !== "https:") {
    throw new Error("O modo live exige NEXT_PUBLIC_SITE_URL com HTTPS.");
  }
  return { apiKey, callbackUrl: callbackUrl.toString() };
}
