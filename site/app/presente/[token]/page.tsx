import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift, Heart, LockKeyhole, Music2, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PresentAudioPlayer } from "./present-audio-player";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Um presente para você · Te Cantei",
  description: "Uma história especial transformada em uma canção exclusiva.",
  robots: { index: false, follow: false },
};

type SharedPresent = {
  found: boolean;
  recipient_name: string;
  title: string;
  duration_seconds: number | null;
  dedication: string;
};

const floatingHearts = [
  "left-[5%] top-[17%] size-5 [animation-delay:-1s] sm:left-[10%]",
  "left-[3%] top-[58%] size-8 [animation-delay:-3.5s] sm:left-[7%]",
  "right-[5%] top-[12%] size-7 [animation-delay:-5s] sm:right-[11%]",
  "right-[3%] top-[62%] size-5 [animation-delay:-2.25s] sm:right-[8%]",
] as const;

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
    <main className="present-page relative min-h-screen overflow-hidden bg-[#090807] px-4 py-6 text-white sm:px-7 sm:py-10">
      <div aria-hidden="true" className="present-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5D77E] to-transparent" />

      {floatingHearts.map((className) => (
        <Heart
          key={className}
          aria-hidden="true"
          className={`present-floating-heart pointer-events-none absolute z-0 fill-[#D4AF55]/10 text-[#D4AF55]/40 ${className}`}
          strokeWidth={1.25}
        />
      ))}

      <article className="tc-premium-frame relative z-10 mx-auto w-full max-w-5xl overflow-hidden rounded-[34px] border border-[#D4AF55]/35 bg-[#11100d]">
        <div aria-hidden="true" className="present-corner present-corner-left" />
        <div aria-hidden="true" className="present-corner present-corner-right" />

        <header className="relative flex items-center justify-between gap-4 border-b border-[#D4AF55]/20 px-5 py-4 sm:px-9 sm:py-6">
          <div className="flex items-center gap-3">
            <BrandLogo compact priority className="size-12 rounded-2xl sm:size-14" />
            <div>
              <p className="font-display text-lg font-semibold text-white sm:text-xl">Te Cantei</p>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D4AF55]">Sua história virou música</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#D4AF55]/25 bg-[#1A1813] px-4 py-2 text-xs font-semibold text-[#F5D77E] sm:flex">
            <LockKeyhole className="size-3.5" /> Presente privado
          </div>
        </header>

        <div className="relative px-5 pb-8 pt-12 text-center sm:px-12 sm:pb-12 sm:pt-16">
          <div aria-hidden="true" className="present-halo pointer-events-none absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />

          <div className="relative mx-auto flex size-16 items-center justify-center rounded-full border border-[#F5D77E]/45 bg-[#1A1813] sm:size-20">
            <Heart className="present-heartbeat size-8 fill-[#D4AF55] text-[#F5D77E] sm:size-10" strokeWidth={1.35} />
            <span className="absolute -right-1 top-0 grid size-6 place-items-center rounded-full border border-[#D4AF55]/40 bg-[#090807]">
              <Sparkles className="size-3 text-[#F5D77E]" />
            </span>
          </div>

          <div className="relative mx-auto mt-7 w-fit rounded-full border border-[#D4AF55]/25 bg-[#1A1813] px-4 py-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#D4AF55]">
            <Gift className="mr-2 inline size-3.5" /> Uma surpresa feita só para você
          </div>

          <p className="relative mt-8 text-xs font-bold uppercase tracking-[.28em] text-[#B8AE99]">Para</p>
          <p className="present-metallic-text relative mt-2 font-display text-4xl font-semibold leading-tight sm:text-6xl">
            {data.recipient_name}
          </p>
          <h1 className="relative mx-auto mt-5 max-w-3xl font-display text-2xl font-medium leading-snug text-white sm:text-4xl">
            “{data.title}”
          </h1>

          <section className="relative mx-auto mt-10 max-w-3xl rounded-[28px] border border-[#D4AF55]/35 bg-[#17150f] px-6 py-9 sm:px-12 sm:py-12">
            <Heart aria-hidden="true" className="absolute -left-3 -top-3 size-7 fill-[#090807] text-[#D4AF55]" />
            <Heart aria-hidden="true" className="absolute -bottom-3 -right-3 size-7 fill-[#090807] text-[#D4AF55]" />
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#D4AF55]">Uma mensagem do coração</p>
            <span aria-hidden="true" className="mt-5 block font-display text-5xl leading-none text-[#D4AF55]">“</span>
            <blockquote className="-mt-4 whitespace-pre-line font-display text-2xl font-medium italic leading-relaxed text-white sm:text-3xl sm:leading-relaxed">
              {data.dedication}
            </blockquote>
            <div aria-hidden="true" className="mx-auto mt-7 h-px w-24 bg-gradient-to-r from-transparent via-[#F5D77E] to-transparent" />
            <p className="mt-5 text-xs font-medium tracking-wide text-[#B8AE99]">Uma lembrança criada para atravessar o tempo.</p>
          </section>
        </div>

        <section className="relative border-t border-[#D4AF55]/20 bg-[#0d0c09] px-5 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-center gap-3 text-center sm:justify-start sm:text-left">
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-[#D4AF55]/35 bg-[#1A1813]">
                <Music2 className="size-5 text-[#F5D77E]" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-white">Agora, dê o play no seu presente</p>
                <p className="mt-1 text-xs text-[#B8AE99]">{formatDuration(data.duration_seconds)} · música completa e exclusiva</p>
              </div>
            </div>

            <PresentAudioPlayer
              audioUrl={`/api/presente/${token}/audio?mode=stream`}
              downloadUrl={`/api/presente/${token}/audio?mode=download`}
              title={data.title}
              durationSeconds={data.duration_seconds}
            />

            <p className="mt-6 flex items-start justify-center gap-2 text-center text-[11px] leading-5 text-[#8f8777]">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-[#D4AF55]" />
              Este link é privado e pode ser revogado por quem criou o presente.
            </p>
          </div>
        </section>

        <footer className="border-t border-[#D4AF55]/15 px-5 py-5 text-center text-[10px] font-semibold uppercase tracking-[.2em] text-[#8f8777]">
          Feito com afeto, memória e música · Te Cantei
        </footer>
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
