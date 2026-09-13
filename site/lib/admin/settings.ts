import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKieGenerationMode, getKieModel, type KieGenerationMode } from "@/lib/music/kie-env";
import type { KieModel } from "@/lib/music/kie-client";

export const OPENAI_LYRIC_MODELS = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-6-astra",
] as const;
export type OpenAiLyricModel = (typeof OPENAI_LYRIC_MODELS)[number];
export const ADMIN_KIE_MODELS = ["V5", "V5_5", "V6", "V6_MINI", "V6_WILD"] as const;

export type ApplicationSettings = {
  lyricsMode: "mock" | "openai";
  lyricsModel: OpenAiLyricModel;
  lyricsReasoningEffort: "none" | "low" | "medium" | "high";
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
    lyricsMode: data?.lyrics_mode === "openai" ? "openai" : "mock",
    lyricsModel: OPENAI_LYRIC_MODELS.includes(configuredLyricsModel as OpenAiLyricModel)
      ? configuredLyricsModel as OpenAiLyricModel
      : envLyricsModel(),
    lyricsReasoningEffort: isReasoningEffort(data?.lyrics_reasoning_effort)
      ? data.lyrics_reasoning_effort
      : "low",
    musicMode: data?.music_mode === "live" ? "live" : getKieGenerationMode(),
    musicModel: data?.music_model ? data.music_model as KieModel : getKieModel(),
  };
}

export function effectiveLyricsMode(selected: ApplicationSettings["lyricsMode"]) {
  return selected === "openai" && process.env.OPENAI_LIVE_ENABLED?.trim() === "true"
    ? "openai" as const
    : "mock" as const;
}

export function effectiveMusicMode(selected: KieGenerationMode) {
  return selected === "live" &&
    getKieGenerationMode() === "live" &&
    process.env.KIE_LIVE_GENERATION_ENABLED?.trim() === "true"
    ? "live" as const
    : "mock" as const;
}

export function integrationReadiness() {
  return {
    openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    openaiLiveGateEnabled: process.env.OPENAI_LIVE_ENABLED?.trim() === "true",
    kieKeyConfigured: Boolean(process.env.KIE_API_KEY?.trim()),
    kieLiveGateEnabled: process.env.KIE_LIVE_GENERATION_ENABLED?.trim() === "true" &&
      getKieGenerationMode() === "live",
  };
}

function envLyricsModel(): OpenAiLyricModel {
  const configured = process.env.OPENAI_LYRICS_MODEL?.trim();
  return OPENAI_LYRIC_MODELS.includes(configured as OpenAiLyricModel)
    ? configured as OpenAiLyricModel
    : "gpt-5.6-terra";
}

function isReasoningEffort(value: unknown): value is ApplicationSettings["lyricsReasoningEffort"] {
  return value === "none" || value === "low" || value === "medium" || value === "high";
}
