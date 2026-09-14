import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().max(20).refine((value) => value === "" || /^\+[1-9][0-9]{9,14}$/.test(value)),
  role: z.enum(["user", "support", "admin"]),
  reason: z.string().trim().min(8).max(300),
});
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_user" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    const created = await admin.auth.admin.createUser({
      email: input.data.email,
      password: input.data.password,
      email_confirm: true,
      user_metadata: { display_name: input.data.displayName, whatsapp: input.data.whatsapp || null },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error("user_not_created");
    const role = roleFlags(input.data.role);
    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.data.user.id,
      display_name: input.data.displayName,
      whatsapp: input.data.whatsapp || null,
      is_admin: role.isAdmin,
      is_support: role.isSupport,
      account_status: "active",
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      throw profileError;
    }
    await writeAudit(admin, identity.id, "create_user", "user", created.data.user.id, input.data.reason, { role: input.data.role });
    return NextResponse.json({ userId: created.data.user.id }, { status: 201, headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "user_create_failed" }, { status: 503, headers: NO_STORE });
  }
}

export function roleFlags(role: "user" | "support" | "admin") {
  return { isAdmin: role === "admin", isSupport: role === "support" || role === "admin" };
}

export async function writeAudit(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  reason: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await admin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    reason,
    metadata,
  });
  if (error) throw error;
}
