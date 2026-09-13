import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminIdentity = {
  id: string;
  email: string | null;
};

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_admin || profile.account_status !== "active") return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

