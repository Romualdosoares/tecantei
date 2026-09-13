import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { deleteKieApiKey, putKieApiKey } from "@/lib/admin/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "private, no-store" };
const saveSchema = z.object({
  provider: z.literal("kie"),
  apiKey: z.string().trim().min(16).max(512),
  reason: z.string().trim().min(8).max(300),
});
const deleteSchema = z.object({
  provider: z.literal("kie"),
  reason: z.string().trim().min(8).max(300),
});

export async function POST(request: Request) {
  const input = saveSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_secret" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    await putKieApiKey(createSupabaseAdminClient(), input.data.apiKey, identity.id, input.data.reason);
    return NextResponse.json({ configured: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "secret_update_failed" }, { status: 503, headers: NO_STORE });
  }
}

export async function DELETE(request: Request) {
  const input = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_secret" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    await deleteKieApiKey(createSupabaseAdminClient(), identity.id, input.data.reason);
    return NextResponse.json({ configured: false }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "secret_delete_failed" }, { status: 503, headers: NO_STORE });
  }
}
