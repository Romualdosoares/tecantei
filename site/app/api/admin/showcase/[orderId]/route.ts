import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const idSchema = z.string().uuid();
const requestSchema = z.object({
  reason: z.string().trim().min(8).max(300),
});

export async function DELETE(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
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
    const { data, error } = await admin
      .from("home_showcase")
      .delete()
      .eq("order_id", orderId.data)
      .select("order_id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const { error: auditError } = await admin.from("admin_audit_log").insert({
      actor_id: identity.id,
      action: "remove_home_showcase",
      target_type: "order",
      target_id: orderId.data,
      reason: input.data.reason,
      metadata: {},
    });
    if (auditError) throw auditError;

    return NextResponse.json({ removed: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "showcase_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
