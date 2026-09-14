import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKieGenerationMode, getKieModel, type KieGenerationMode } from "@/lib/music/kie-env";
import type { KieModel } from "@/lib/music/kie-client";
import { getPaymentMode, getPaymentProvider, type PaymentProvider } from "@/lib/payment/env";
import { getKieApiKey, getKieWebhookHmacKey, getPaymentSecret, PAYMENT_SECRET_NAMES } from "@/lib/admin/secrets";

export const KIE_LYRIC_MODELS = [
  "gpt-5-6-sol",
  "gpt-5-6-terra",
  "gpt-5-6-luna",
  "gpt-6-astra",
] as const;
export type KieLyricModel = (typeof KIE_LYRIC_MODELS)[number];
export const ADMIN_KIE_MODELS = ["V5", "V5_5", "V6", "V6_MINI", "V6_WILD"] as const;

export type ApplicationSettings = {
  lyricsMode: "mock" | "kie";
  lyricsModel: KieLyricModel;
  lyricsReasoningEffort: "low" | "medium" | "high" | "xhigh";
  musicMode: KieGenerationMode;
  musicModel: KieModel;
  productPriceCents: number;
  paymentProvider: PaymentProvider;
  efiEnvironment: "homologation" | "production";
};

export async function getApplicationSettings(
  admin: SupabaseClient,
): Promise<ApplicationSettings> {
  const { data } = await admin
    .from("application_settings")
    .select("lyrics_mode, lyrics_model, lyrics_reasoning_effort, music_mode, music_model, product_price_cents, payment_provider, efi_environment")
    .eq("id", 1)
    .maybeSingle();

  const configuredLyricsModel = data?.lyrics_model;
  return {
    lyricsMode: data?.lyrics_mode === "kie" ? "kie" : "mock",
    lyricsModel: KIE_LYRIC_MODELS.includes(configuredLyricsModel as KieLyricModel)
      ? configuredLyricsModel as KieLyricModel
      : envLyricsModel(),
    lyricsReasoningEffort: isReasoningEffort(data?.lyrics_reasoning_effort)
      ? data.lyrics_reasoning_effort
      : "low",
    musicMode: data?.music_mode === "live" || data?.music_mode === "mock"
      ? data.music_mode
      : getKieGenerationMode(),
    musicModel: data?.music_model ? data.music_model as KieModel : getKieModel(),
    productPriceCents: validProductPrice(data?.product_price_cents) ? data.product_price_cents : 1_990,
    paymentProvider: data?.payment_provider === "efi" || data?.payment_provider === "mercado_pago"
      ? data.payment_provider
      : getPaymentProvider(),
    efiEnvironment: data?.efi_environment === "production" ? "production" : "homologation",
  };
}

export function effectiveLyricsMode(selected: ApplicationSettings["lyricsMode"], keyConfigured: boolean) {
  return selected === "kie" && keyConfigured && process.env.KIE_LIVE_LYRICS_ENABLED?.trim() === "true"
    ? "kie" as const
    : "mock" as const;
}

export function effectiveMusicMode(selected: KieGenerationMode) {
  return selected === "live" &&
    getKieGenerationMode() === "live" &&
    process.env.KIE_LIVE_GENERATION_ENABLED?.trim() === "true"
    ? "live" as const
    : "mock" as const;
}

export async function integrationReadiness(admin: SupabaseClient) {
  const [
    kieApiKey,
    kieWebhookHmacKey,
    mercadoPagoAccessToken,
    mercadoPagoWebhookSecret,
    efiClientId,
    efiClientSecret,
    efiPixKey,
    efiCertificate,
    efiWebhookToken,
    efiGatewaySecret,
  ] = await Promise.all([
    getKieApiKey(admin),
    getKieWebhookHmacKey(admin),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.mercadoPagoAccessToken, "MERCADO_PAGO_ACCESS_TOKEN"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.mercadoPagoWebhookSecret, "MERCADO_PAGO_WEBHOOK_SECRET"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiClientId, "EFI_CLIENT_ID"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiClientSecret, "EFI_CLIENT_SECRET"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiPixKey, "EFI_PIX_KEY"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiCertificateP12Base64, "EFI_CERTIFICATE_P12_BASE64"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiWebhookToken, "EFI_WEBHOOK_TOKEN"),
    getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiWebhookMtlsGatewaySecret, "EFI_WEBHOOK_MTLS_GATEWAY_SECRET"),
  ]);
  return {
    kieKeyConfigured: Boolean(kieApiKey),
    kieWebhookHmacConfigured: Boolean(kieWebhookHmacKey),
    kieLyricsLiveGateEnabled: process.env.KIE_LIVE_LYRICS_ENABLED?.trim() === "true",
    kieLiveGateEnabled: process.env.KIE_LIVE_GENERATION_ENABLED?.trim() === "true" &&
      getKieGenerationMode() === "live" && Boolean(kieWebhookHmacKey),
    mercadoPagoConfigured: Boolean(mercadoPagoAccessToken && mercadoPagoWebhookSecret),
    efiConfigured: Boolean(efiClientId && efiClientSecret && efiPixKey && efiCertificate && efiWebhookToken && efiGatewaySecret),
    paymentMode: getPaymentMode(),
    paymentLiveGateEnabled: process.env.PAYMENT_LIVE_ENABLED?.trim() === "true",
    efiMtlsGatewayEnabled: process.env.EFI_WEBHOOK_MTLS_TERMINATION?.trim() === "gateway",
    efiDirectWebhookEnabled: process.env.EFI_WEBHOOK_MTLS_TERMINATION?.trim() === "direct",
  };
}

function validProductPrice(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 1_000_000;
}

function envLyricsModel(): KieLyricModel {
  const configured = process.env.KIE_LYRICS_MODEL?.trim();
  return KIE_LYRIC_MODELS.includes(configured as KieLyricModel)
    ? configured as KieLyricModel
    : "gpt-5-6-terra";
}

function isReasoningEffort(value: unknown): value is ApplicationSettings["lyricsReasoningEffort"] {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh";
}
