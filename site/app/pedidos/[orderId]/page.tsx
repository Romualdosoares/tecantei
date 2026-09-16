import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrderEditor } from "./order-editor";
import type { VoicePreference } from "@/lib/order-options";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

type OrderRecord = {
  id: string;
  status: string;
  adjustment_status: string;
  occasion: string;
  recipient_name: string;
  pronunciation: string | null;
  story: string;
  style: string;
  voice_preference: VoicePreference;
  updated_at: string;
};

type LyricRecord = {
  id: string;
  kind: "source" | "proposed" | "approved";
  revision: number;
  content: string;
  created_at: string;
};

type MusicVersionRecord = {
  id: string;
  origin: "original" | "adjustment";
  status: string;
  title: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const parsedId = z.string().uuid().safeParse((await params).orderId);
  if (!parsedId.success) notFound();
  if (!getSupabasePublicConfig()) redirect("/pedidos");

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/");

  const { data: orderData } = await supabase
    .from("orders")
    .select("id, status, adjustment_status, occasion, recipient_name, pronunciation, story, style, voice_preference, updated_at")
    .eq("id", parsedId.data)
    .eq("owner_id", authData.user.id)
    .maybeSingle();
  if (!orderData) notFound();

  const { data: lyricData } = await supabase
    .from("lyrics")
    .select("id, kind, revision, content, created_at")
    .eq("order_id", parsedId.data)
    .order("revision", { ascending: false });
  const { data: generationTask } = await supabase
    .from("generation_tasks")
    .select("status, model, updated_at")
    .eq("order_id", parsedId.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: versionData } = await supabase
    .from("music_versions")
    .select("id, origin, status, title, duration_seconds, created_at")
    .eq("order_id", parsedId.data)
    .order("created_at", { ascending: true });
  const { data: adjustmentRequest } = await supabase
    .from("adjustment_requests")
    .select("id, source_version_id, status, customer_notes, updated_at")
    .eq("order_id", parsedId.data)
    .maybeSingle();
  const { data: selection } = await supabase
    .from("order_selections")
    .select("version_id, selected_at")
    .eq("order_id", parsedId.data)
    .maybeSingle();
  const { data: paymentIntent } = await supabase
    .from("payment_intents")
    .select("id, version_id, provider, status, amount_cents, currency, created_at")
    .eq("order_id", parsedId.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const admin = createSupabaseAdminClient();
  const { data: delivery } = await admin
    .from("deliveries")
    .select("id, version_id, dedication, share_enabled_at, revoked_at, first_accessed_at")
    .eq("order_id", parsedId.data)
    .maybeSingle();

  const order = orderData as OrderRecord;
  const lyrics = (lyricData ?? []) as LyricRecord[];
  const latestSource = lyrics.find((item) => item.kind === "source") ?? null;
  const latestProposed = lyrics.find((item) => item.kind === "proposed") ?? null;
  const latestApproved = lyrics.find((item) => item.kind === "approved") ?? null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/pedidos" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Meus pedidos</Link>
          <span className="flex items-center gap-3 font-display text-2xl font-semibold"><BrandLogo compact priority className="size-10 rounded-xl" />Te Cantei</span>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10"><LockKeyhole /> Pedido privado</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Música para {order.recipient_name}</h1>
        <p className="mt-2 text-muted-foreground">Revise os detalhes e a letra antes da primeira geração. Cada alteração fica registrada.</p>
        <OrderEditor
          key={`${order.updated_at}:${generationTask?.updated_at ?? "none"}`}
          order={order}
          latestSource={latestSource}
          latestProposed={latestProposed}
          latestApproved={latestApproved}
          revisionCounts={{
            source: lyrics.filter((item) => item.kind === "source").length,
            proposed: lyrics.filter((item) => item.kind === "proposed").length,
            approved: lyrics.filter((item) => item.kind === "approved").length,
          }}
          generationTask={generationTask as { status: string; model: string; updated_at: string } | null}
          musicVersions={(versionData ?? []) as MusicVersionRecord[]}
          adjustmentRequest={adjustmentRequest as { id: string; source_version_id: string; status: string; customer_notes: string; updated_at: string } | null}
          selection={selection as { version_id: string; selected_at: string } | null}
          paymentIntent={paymentIntent as { id: string; version_id: string; provider: string; status: string; amount_cents: number; currency: string; created_at: string } | null}
          delivery={delivery as { id: string; version_id: string; dedication: string | null; share_enabled_at: string | null; revoked_at: string | null; first_accessed_at: string | null } | null}
        />
      </section>
    </main>
  );
}
