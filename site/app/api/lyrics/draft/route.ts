import { NextResponse } from "next/server";
import { z } from "zod";
import { createMockLyricDraft } from "@/lib/lyrics/draft-generator";
import { createKieLyricDraft } from "@/lib/lyrics/kie-client";
import { effectiveLyricsMode, getApplicationSettings } from "@/lib/admin/settings";
import { getKieApiKey } from "@/lib/admin/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

const MAX_BODY_BYTES = 8 * 1_024;
const NO_STORE = { "Cache-Control": "private, no-store" };
const payloadSchema = z.object({
  occasion: z.string().trim().min(1).max(80),
  recipient: z.string().trim().min(1).max(120),
  pronunciation: z.string().trim().max(200).default(""),
  story: z.string().trim().min(200).max(4_000),
  style: z.string().trim().min(1).max(120),
  voicePreference: z.enum(["masculina", "feminina"]),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers: NO_STORE });
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_story" }, { status: 400, headers: NO_STORE });
    }
    const payload = payloadSchema.safeParse(parsedBody);
    if (!payload.success) {
      return NextResponse.json({ error: "invalid_story" }, { status: 400, headers: NO_STORE });
    }

    const config = getSupabasePublicConfig();
    const admin = config ? createSupabaseAdminClient() : null;
    const settings = admin
      ? await getApplicationSettings(admin)
      : {
          lyricsMode: "mock" as const,
          lyricsModel: "gpt-5-6-terra" as const,
          lyricsReasoningEffort: "low" as const,
          musicMode: "mock" as const,
          musicModel: "V6" as const,
        };
    const apiKey = admin ? await getKieApiKey(admin) : null;
    const mode = effectiveLyricsMode(settings.lyricsMode, Boolean(apiKey));
    const generated = mode === "kie"
      ? await createKieLyricDraft(payload.data, settings, apiKey!)
      : { lyrics: createMockLyricDraft(payload.data), responseId: null };
    return NextResponse.json(
      {
        lyrics: generated.lyrics,
        mode,
        model: mode === "kie" ? settings.lyricsModel : "mock-local",
        simulated: mode === "mock",
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "lyrics_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
