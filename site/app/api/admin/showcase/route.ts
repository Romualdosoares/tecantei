import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const requestSchema = z.object({
  orderId: z.string().uuid(),
  versionId: z.string().uuid(),
  reason: z.string().trim().min(8).max(300),
});

export async function POST(request: Request) {
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const identity = await getAdminIdentity();
    if (!identity) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const admin = createSupabaseAdminClient();
    const expectedKey = `orders/${input.data.orderId}/versions/${input.data.versionId}/full.mp3`;
    const { data: version, error: versionError } = await admin
      .from("music_versions")
      .select("id, status, full_audio_object_key")
      .eq("id", input.data.versionId)
      .eq("order_id", input.data.orderId)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version || version.status !== "ready" || version.full_audio_object_key !== expectedKey) {
      return NextResponse.json({ error: "version_not_ready" }, { status: 409, headers: NO_STORE });
    }

    const { data: existing, error: existingError } = await admin
      .from("home_showcase")
      .select("order_id, position");
    if (existingError) throw existingError;
    const rows = existing ?? [];
    if (rows.some((row) => row.order_id === input.data.orderId)) {
      return NextResponse.json({ error: "already_showcased" }, { status: 409, headers: NO_STORE });
    }
    const usedPositions = new Set(rows.map((row) => row.position));
    const position = [1, 2, 3, 4, 5, 6].find((candidate) => !usedPositions.has(candidate));
    if (!position) {
      return NextResponse.json({ error: "showcase_limit_reached" }, { status: 409, headers: NO_STORE });
    }

    const { error: insertError } = await admin.from("home_showcase").insert({
      order_id: input.data.orderId,
      version_id: input.data.versionId,
      position,
      created_by: identity.id,
    });
    if (insertError) {
      return NextResponse.json({ error: "showcase_conflict" }, { status: 409, headers: NO_STORE });
    }

    const { error: auditError } = await admin.from("admin_audit_log").insert({
      actor_id: identity.id,
      action: "add_home_showcase",
      target_type: "order",
      target_id: input.data.orderId,
      reason: input.data.reason,
      metadata: { version_id: input.data.versionId, position },
    });
    if (auditError) throw auditError;

    return NextResponse.json({ showcased: true, position }, { status: 201, headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "showcase_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
