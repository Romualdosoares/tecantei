import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { DeliveryExperience } from "./delivery-experience";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({ params }: { params: Promise<{ orderId: string }> }) {
  const parsedId = z.string().uuid().safeParse((await params).orderId);
  if (!parsedId.success) notFound();
  if (!getSupabasePublicConfig()) redirect("/pedidos");
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/");
  const { data: order } = await supabase.from("orders")
    .select("id, status, recipient_name")
    .eq("id", parsedId.data)
    .eq("owner_id", authData.user.id)
    .maybeSingle();
  if (!order) notFound();
  if (order.status !== "paid" && order.status !== "delivered") redirect(`/pedidos/${order.id}`);

  const admin = createSupabaseAdminClient();
  const { data: delivery } = await admin.from("deliveries")
    .select("version_id, dedication, share_enabled_at, revoked_at")
    .eq("order_id", order.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (!delivery) redirect(`/pedidos/${order.id}`);
  const { data: version } = await admin.from("music_versions")
    .select("title, duration_seconds")
    .eq("id", delivery.version_id)
    .eq("order_id", order.id)
    .maybeSingle();
  if (!version) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-primary/20 bg-background/95">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href={`/pedidos/${order.id}`} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar ao pedido</Link>
          <BrandLogo priority className="w-32" />
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 text-center"><Badge variant="outline" className="rounded-full"><LockKeyhole /> Entrega privada</Badge><p className="mt-4 text-sm text-muted-foreground">Sua compra foi confirmada. Agora é hora de guardar e compartilhar este momento.</p></div>
        <DeliveryExperience orderId={order.id} recipient={order.recipient_name} title={version.title ?? `Canção para ${order.recipient_name}`} durationSeconds={version.duration_seconds} initialDedication={delivery.dedication ?? `Fiz esta música especialmente para você, ${order.recipient_name}.`} initialShareActive={Boolean(delivery.share_enabled_at)} />
      </section>
    </main>
  );
}
