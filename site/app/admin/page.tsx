import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!getSupabasePublicConfig()) redirect("/");
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin/login");
  return <AdminDashboard adminEmail={identity.email ?? "Administrador"} />;
}
