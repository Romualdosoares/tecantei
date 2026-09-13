import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKieGenerationMode, getKieModel, type KieGenerationMode } from "@/lib/music/kie-env";
import type { KieModel } from "@/lib/music/kie-client";
import { getKieApiKey, getKieWebhookHmacKey } from "@/lib/admin/secrets";

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
};

export async function getApplicationSettings(
  admin: SupabaseClient,
): Promise<ApplicationSettings> {
  const { data } = await admin
    .from("application_settings")
    .select("lyrics_mode, lyrics_model, lyrics_reasoning_effort, music_mode, music_model")
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
  const [kieApiKey, kieWebhookHmacKey] = await Promise.all([
    getKieApiKey(admin),
    getKieWebhookHmacKey(admin),
  ]);
  return {
    kieKeyConfigured: Boolean(kieApiKey),
    kieWebhookHmacConfigured: Boolean(kieWebhookHmacKey),
    kieLyricsLiveGateEnabled: process.env.KIE_LIVE_LYRICS_ENABLED?.trim() === "true",
    kieLiveGateEnabled: process.env.KIE_LIVE_GENERATION_ENABLED?.trim() === "true" &&
      getKieGenerationMode() === "live" && Boolean(kieWebhookHmacKey),
  };
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
