import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileMusic, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  draft: "História em edição",
  lyrics_review: "Letra para revisar",
  lyrics_approved: "Letra aprovada",
  generating: "Criando música",
  preview_ready: "Prévia pronta",
  payment_pending: "Pagamento pendente",
  paid: "Pagamento aprovado",
  delivered: "Presente entregue",
  cancelled: "Cancelado",
};

type OrderSummary = {
  id: string;
  status: string;
  occasion: string;
  recipient_name: string;
  style: string;
  updated_at: string;
};

export default async function OrdersPage() {
  if (!getSupabasePublicConfig()) {
    return <UnavailableState />;
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/");

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, occasion, recipient_name, style, updated_at")
      .eq("owner_id", authData.user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("is_support").eq("id", authData.user.id).maybeSingle(),
  ]);
  const orders = (data ?? []) as OrderSummary[];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight"><BrandLogo compact priority className="size-10 rounded-xl" /><span>Te Cantei</span></Link>
          <div className="flex items-center gap-2">
            {profile?.is_support && <Button asChild variant="ghost" className="rounded-full"><Link href="/suporte"><ShieldCheck /> Suporte</Link></Button>}
            <Button asChild className="rounded-full"><Link href="/"><Plus /> Nova música</Link></Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10"><LockKeyhole /> Área privada</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Meus pedidos</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Acompanhe suas letras, prévias, pagamentos e presentes sem expor a história na listagem.</p>

        {error ? (
          <p role="alert" className="mt-8 rounded-2xl bg-destructive/10 p-5 text-destructive">Não foi possível carregar seus pedidos agora.</p>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed bg-card p-8 text-center sm:p-12">
            <FileMusic className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Sua primeira música começa com uma história.</h2>
            <p className="mt-2 text-muted-foreground">Quando você aprovar a letra, o pedido aparecerá aqui.</p>
            <Button asChild className="mt-6 rounded-full"><Link href="/">Criar uma música <ArrowRight /></Link></Button>
          </div>
        ) : (
          <ul className="mt-9 grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/pedidos/${order.id}`} className="group flex h-full items-center justify-between gap-5 rounded-[24px] border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-6">
                  <div className="min-w-0">
                    <Badge variant="outline" className="rounded-full">{statusLabels[order.status] ?? order.status}</Badge>
                    <h2 className="mt-4 truncate font-display text-2xl font-semibold">Música para {order.recipient_name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{order.occasion} · {order.style}</p>
                    <p className="mt-4 text-xs text-muted-foreground">Atualizado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(order.updated_at))}</p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white"><ArrowRight className="size-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function UnavailableState() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="max-w-md rounded-[28px] border bg-card p-8 text-center">
        <LockKeyhole className="mx-auto size-9 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Área privada ainda não conectada</h1>
        <p className="mt-3 text-muted-foreground">Configure o ambiente Supabase de desenvolvimento para testar pedidos reais. O protótipo principal continua disponível.</p>
        <Button asChild className="mt-6 rounded-full"><Link href="/">Voltar ao protótipo</Link></Button>
      </section>
    </main>
  );
}
