import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin/auth";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { AdminLoginForm } from "./admin-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar no painel — Te Cantei",
  description: "Acesso restrito à central administrativa do Te Cantei.",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (!getSupabasePublicConfig()) redirect("/");
  const identity = await getAdminIdentity();
  if (identity) redirect("/admin");

  return <AdminLoginForm />;
}
