import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const runtime = "nodejs";

const schema = z.object({
  eventType: z.enum(["page_view", "cta_create_music", "funnel_step", "checkout_open", "purchase_confirmed"]),
  path: z.string().trim().min(1).max(200).regex(/^\//),
  sessionId: z.string().uuid(),
  metadata: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).default({}),
});

export async function POST(request: Request) {
  if (!getSupabasePublicConfig()) return new NextResponse(null, { status: 204 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  try {
    const sessionHash = createHash("sha256").update(parsed.data.sessionId).digest("hex");
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("analytics_events").insert({
      event_type: parsed.data.eventType,
      path: parsed.data.path,
      session_hash: sessionHash,
      owner_id: authData.user?.id ?? null,
      metadata: parsed.data.metadata,
    });
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

