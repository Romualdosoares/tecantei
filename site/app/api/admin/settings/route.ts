import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { ADMIN_KIE_MODELS, KIE_LYRIC_MODELS } from "@/lib/admin/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "../users/route";

const schema = z.object({
  lyricsMode: z.enum(["mock", "kie"]),
  lyricsModel: z.enum(KIE_LYRIC_MODELS),
  lyricsReasoningEffort: z.enum(["low", "medium", "high", "xhigh"]),
  musicMode: z.enum(["mock", "live"]),
  musicModel: z.enum(ADMIN_KIE_MODELS),
  reason: z.string().trim().min(8).max(300),
});
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function PATCH(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_settings" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    await writeAudit(admin, identity.id, "update_ai_settings_requested", "application_settings", "1", input.data.reason, {
      lyricsMode: input.data.lyricsMode,
      lyricsModel: input.data.lyricsModel,
      musicMode: input.data.musicMode,
      musicModel: input.data.musicModel,
    });
    const { error } = await admin.from("application_settings").upsert({
      id: 1,
      lyrics_mode: input.data.lyricsMode,
      lyrics_model: input.data.lyricsModel,
      lyrics_reasoning_effort: input.data.lyricsReasoningEffort,
      music_mode: input.data.musicMode,
      music_model: input.data.musicModel,
      updated_by: identity.id,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ updated: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "settings_update_failed" }, { status: 503, headers: NO_STORE });
  }
}
