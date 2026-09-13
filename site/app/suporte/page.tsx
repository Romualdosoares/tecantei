import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupportConsole } from "./support-console";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  if (!getSupabasePublicConfig()) redirect("/");

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_support")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!profile?.is_support) redirect("/pedidos");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">Te Cantei</Link>
          <Button asChild variant="ghost" className="rounded-full"><Link href="/pedidos"><ArrowLeft /> Pedidos</Link></Button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10"><ShieldCheck /> Acesso de suporte</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Diagnóstico de pedidos</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">Localize estados técnicos sem abrir a história nem a letra do cliente. Toda consulta exige um motivo e fica registrada.</p>
        <SupportConsole />
      </section>
    </main>
  );
}

