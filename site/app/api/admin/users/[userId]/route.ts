import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { roleFlags, writeAudit } from "../route";

const idSchema = z.string().uuid();
const updateSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128).optional(),
  displayName: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().max(20).refine((value) => value === "" || /^\+[1-9][0-9]{9,14}$/.test(value)),
  role: z.enum(["user", "support", "admin"]),
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(8).max(300),
});
const deleteSchema = z.object({ reason: z.string().trim().min(12).max(300) });
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const userId = idSchema.safeParse((await context.params).userId);
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!userId.success || !input.success) return NextResponse.json({ error: "invalid_user" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const isCurrentAdmin = identity.id === userId.data;
    if (isCurrentAdmin && (input.data.role !== "admin" || input.data.status !== "active")) {
      return NextResponse.json({ error: "cannot_lock_current_admin" }, { status: 409, headers: NO_STORE });
    }
    if (isCurrentAdmin && (input.data.password || input.data.email.toLowerCase() !== identity.email?.toLowerCase())) {
      return NextResponse.json({ error: "cannot_change_current_admin_credentials" }, { status: 409, headers: NO_STORE });
    }
    const admin = createSupabaseAdminClient();
    await writeAudit(admin, identity.id, "update_user_requested", "user", userId.data, input.data.reason, {
      role: input.data.role,
      status: input.data.status,
    });
    if (!isCurrentAdmin) {
      const authUpdate = await admin.auth.admin.updateUserById(userId.data, {
        email: input.data.email,
        ...(input.data.password ? { password: input.data.password } : {}),
        ban_duration: input.data.status === "suspended" ? "876000h" : "none",
        user_metadata: { display_name: input.data.displayName, whatsapp: input.data.whatsapp || null },
      });
      if (authUpdate.error) throw authUpdate.error;
    }
    const role = roleFlags(input.data.role);
    const { error } = await admin.from("profiles").update({
      display_name: input.data.displayName,
      whatsapp: input.data.whatsapp || null,
      is_admin: role.isAdmin,
      is_support: role.isSupport,
      account_status: input.data.status,
    }).eq("id", userId.data);
    if (error) throw error;
    return NextResponse.json({ updated: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "user_update_failed" }, { status: 503, headers: NO_STORE });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  const userId = idSchema.safeParse((await context.params).userId);
  const input = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!userId.success || !input.success) return NextResponse.json({ error: "invalid_user" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    if (identity.id === userId.data) return NextResponse.json({ error: "cannot_delete_current_admin" }, { status: 409, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    await writeAudit(admin, identity.id, "soft_delete_user_requested", "user", userId.data, input.data.reason);
    const { error: profileError } = await admin.from("profiles").update({ account_status: "deleted", is_admin: false, is_support: false }).eq("id", userId.data);
    if (profileError) throw profileError;
    const deleted = await admin.auth.admin.deleteUser(userId.data, true);
    if (deleted.error) throw deleted.error;
    return NextResponse.json({ deleted: true, historyPreserved: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "user_delete_failed" }, { status: 503, headers: NO_STORE });
  }
}
