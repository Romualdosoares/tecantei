import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getApplicationSettings } from "@/lib/admin/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "../../users/route";

export const runtime = "nodejs";
const schema = z.object({ provider: z.enum(["openai", "kie"]), reason: z.string().trim().min(8).max(300) });
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_test" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    const settings = await getApplicationSettings(admin);
    await writeAudit(admin, identity.id, "test_integration", "integration", input.data.provider, input.data.reason);
    if (input.data.provider === "openai") {
      const key = process.env.OPENAI_API_KEY?.trim();
      if (!key) return NextResponse.json({ connected: false, message: "Chave da OpenAI não configurada." }, { status: 409, headers: NO_STORE });
      const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(settings.lyricsModel)}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15_000),
      });
      return NextResponse.json({ connected: response.ok, message: response.ok ? `Modelo ${settings.lyricsModel} disponível.` : `OpenAI respondeu ${response.status}.` }, { status: response.ok ? 200 : 502, headers: NO_STORE });
    }
    const key = process.env.KIE_API_KEY?.trim();
    if (!key) return NextResponse.json({ connected: false, message: "Chave da Kie.ai não configurada." }, { status: 409, headers: NO_STORE });
    const response = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { code?: number; data?: number } | null;
    const connected = response.ok && payload?.code === 200;
    return NextResponse.json({ connected, credits: connected ? payload?.data : null, message: connected ? "Kie.ai conectada e saldo consultado." : `Kie.ai respondeu ${response.status}.` }, { status: connected ? 200 : 502, headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "integration_test_failed" }, { status: 503, headers: NO_STORE });
  }
}

