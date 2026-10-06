import "server-only";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
