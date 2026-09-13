import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift, Heart, LockKeyhole, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Um presente para você · Te Cantei",
  robots: { index: false, follow: false },
};

type SharedPresent = {
  found: boolean;
  recipient_name: string;
  title: string;
  duration_seconds: number | null;
  dedication: string;
};

export default async function PresentPage({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const tokenHash = await hashShareToken(token);
  if (!tokenHash) notFound();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("get_shared_present", {
    target_token_hash: tokenHash,
  });
  if (error || !isSharedPresent(data) || !data.found) notFound();

  return (
    <main className="grid min-h-screen place-items-center bg-[#fff8f4] px-5 py-10 text-foreground">
      <article className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-[#351426] text-white shadow-[0_30px_100px_rgba(53,20,38,.24)]">
        <div className="relative p-7 sm:p-11">
          <div className="absolute -right-16 -top-20 size-64 rounded-full bg-[#f6aeba]/20 blur-3xl" />
          <Badge className="relative rounded-full bg-white/10 text-white hover:bg-white/10"><Gift /> Um presente Te Cantei</Badge>
          <Heart className="relative mt-12 size-10 fill-[#f6aeba] text-[#f6aeba]" />
          <p className="relative mt-6 text-sm uppercase tracking-[.18em] text-white/55">Para {data.recipient_name}</p>
          <h1 className="relative mt-2 font-display text-4xl font-semibold sm:text-5xl">{data.title}</h1>
          <blockquote className="relative mt-7 border-l-2 border-[#f6aeba]/60 pl-5 text-lg leading-8 text-white/80">{data.dedication}</blockquote>
        </div>
        <div className="m-4 rounded-[24px] bg-white p-5 text-foreground sm:m-7 sm:p-8">
          <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full bg-primary/10"><Music2 className="text-primary" /></span><div><p className="font-display text-xl font-semibold">Ouça sua música</p><p className="text-sm text-muted-foreground">{formatDuration(data.duration_seconds)} · áudio completo</p></div></div>
          <audio className="mt-6 w-full" controls preload="metadata" src={`/api/presente/${token}/audio`}>Seu navegador não oferece suporte ao player de áudio.</audio>
          <p className="mt-6 flex gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />Este link é privado e pode ser revogado por quem criou o presente.</p>
        </div>
      </article>
    </main>
  );
}

function isSharedPresent(value: unknown): value is SharedPresent {
  if (!value || typeof value !== "object") return false;
  const present = value as Record<string, unknown>;
  return present.found === true &&
    typeof present.recipient_name === "string" &&
    typeof present.title === "string" &&
    typeof present.dedication === "string" &&
    (present.duration_seconds === null || typeof present.duration_seconds === "number");
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Música personalizada";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
