import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Gift, Heart, LockKeyhole, Music2, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { findAdminPresentShare } from "@/lib/delivery/admin-present-share";
import { hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasConfirmedDeliveryPayment } from "@/lib/payment/confirmed-delivery";
import { PresentAudioPlayer } from "./present-audio-player";
import { PresentShareActions } from "./present-share-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Um presente para você · Te Cantei",
  description: "Uma história especial transformada em uma canção exclusiva.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Te Cantei",
    title: "Um presente para você · Te Cantei",
    description: "Uma história especial transformada em uma canção exclusiva.",
    images: [{
      url: "/tecantei-logodourada.jpg",
      width: 1254,
      height: 1254,
      alt: "Logo Te Cantei",
    }],
  },
  twitter: {
    card: "summary",
    title: "Um presente para você · Te Cantei",
    description: "Uma história especial transformada em uma canção exclusiva.",
    images: ["/tecantei-logodourada.jpg"],
  },
};

type SharedPresent = {
  found: boolean;
  order_id: string;
  version_id: string;
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
  const { data: paidPresent, error } = await admin.rpc("get_shared_present", {
    target_token_hash: tokenHash,
  });
  const paidAccess = !error && isSharedPresent(paidPresent) && paidPresent.found &&
    await hasConfirmedDeliveryPayment(admin, paidPresent.order_id, paidPresent.version_id)
    ? paidPresent
    : null;
  const adminAccess = paidAccess ? null : await findAdminPresentShare(admin, tokenHash);
  const data: SharedPresent | null = paidAccess ?? (adminAccess ? {
    found: true,
    order_id: adminAccess.orderId,
    version_id: adminAccess.versionId,
    recipient_name: adminAccess.recipientName,
    title: adminAccess.title,
    duration_seconds: adminAccess.durationSeconds,
    dedication: adminAccess.dedication,
  } : null);
  if (!data) notFound();

  return (
    <main className="present-page relative min-h-screen overflow-hidden bg-[#090807] px-2 py-2 text-white sm:px-7 sm:py-10">
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

      <article className="tc-premium-frame relative z-10 mx-auto w-full max-w-5xl overflow-hidden rounded-[24px] border border-[#D4AF55]/35 bg-[#11100d] sm:rounded-[34px]">
        <div aria-hidden="true" className="present-corner present-corner-left" />
        <div aria-hidden="true" className="present-corner present-corner-right" />

        <div className="present-cover flex flex-col sm:block">
          <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-[#D4AF55]/20 px-4 py-2.5 sm:px-9 sm:py-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <BrandLogo compact priority className="size-10 rounded-xl sm:size-14 sm:rounded-2xl" />
              <div>
                <p className="font-display text-base font-semibold text-white sm:text-xl">Te Cantei</p>
                <p className="text-[8px] font-bold uppercase tracking-[.16em] text-[#D4AF55] sm:text-[10px] sm:tracking-[.18em]">Sua história virou música</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#D4AF55]/25 bg-[#1A1813] px-4 py-2 text-xs font-semibold text-[#F5D77E] sm:flex">
              <LockKeyhole className="size-3.5" /> Presente privado
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col justify-center px-4 pb-4 pt-4 text-center sm:block sm:px-12 sm:pb-12 sm:pt-16">
            <div aria-hidden="true" className="present-halo pointer-events-none absolute left-1/2 top-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full sm:size-[30rem]" />

            <div className="relative mx-auto flex size-12 shrink-0 items-center justify-center rounded-full border border-[#F5D77E]/45 bg-[#1A1813] sm:size-20">
              <Heart className="present-heartbeat size-6 fill-[#D4AF55] text-[#F5D77E] sm:size-10" strokeWidth={1.35} />
              <span className="absolute -right-1 top-0 grid size-5 place-items-center rounded-full border border-[#D4AF55]/40 bg-[#090807] sm:size-6">
                <Sparkles className="size-2.5 text-[#F5D77E] sm:size-3" />
              </span>
            </div>

            <div className="relative mx-auto mt-3 w-fit rounded-full border border-[#D4AF55]/25 bg-[#1A1813] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#D4AF55] sm:mt-7 sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[.2em]">
              <Gift className="mr-1.5 inline size-3 sm:mr-2 sm:size-3.5" /> Uma surpresa feita só para você
            </div>

            <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[.25em] text-[#B8AE99] sm:mt-8 sm:text-xs sm:tracking-[.28em]">Para</p>
            <p className="present-metallic-text relative mt-0.5 break-words font-display text-3xl font-semibold leading-tight sm:mt-2 sm:text-6xl">
              {data.recipient_name}
            </p>
            <h1 className="relative mx-auto mt-2 line-clamp-2 max-w-3xl font-display text-xl font-medium leading-snug text-white sm:mt-5 sm:block sm:text-4xl">
              “{data.title}”
            </h1>

            <section className="relative mx-auto mt-4 w-full max-w-3xl shrink-0 overflow-hidden rounded-[22px] border border-[#D4AF55]/35 bg-[#17150f] px-4 py-4 sm:mt-10 sm:rounded-[28px] sm:px-12 sm:py-12">
              <Heart aria-hidden="true" className="absolute -left-2 -top-2 size-6 fill-[#090807] text-[#D4AF55] sm:-left-3 sm:-top-3 sm:size-7" />
              <Heart aria-hidden="true" className="absolute -bottom-2 -right-2 size-6 fill-[#090807] text-[#D4AF55] sm:-bottom-3 sm:-right-3 sm:size-7" />
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#D4AF55] sm:text-[10px] sm:tracking-[.24em]">Uma mensagem do coração</p>
              <span aria-hidden="true" className="mt-1 block font-display text-3xl leading-none text-[#D4AF55] sm:mt-5 sm:text-5xl">“</span>
              <blockquote className="-mt-2 max-h-[8.5rem] overflow-hidden whitespace-pre-line break-words font-display text-lg font-medium italic leading-snug text-white sm:-mt-4 sm:max-h-none sm:overflow-visible sm:text-3xl sm:leading-relaxed">
                {data.dedication}
              </blockquote>
              <div aria-hidden="true" className="mx-auto mt-3 h-px w-20 bg-gradient-to-r from-transparent via-[#F5D77E] to-transparent sm:mt-7 sm:w-24" />
              <p className="mt-2 text-[10px] font-medium tracking-wide text-[#B8AE99] sm:mt-5 sm:text-xs">Uma lembrança criada para atravessar o tempo.</p>
            </section>
          </div>
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

            <PresentShareActions recipient={data.recipient_name} title={data.title} />
          </div>
        </section>

        <section className="relative border-t border-[#D4AF55]/20 bg-[#11100d] px-5 py-9 text-center sm:px-10 sm:py-12">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D4AF55]">Transforme sentimento em música</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-2xl font-semibold text-white sm:text-3xl">Quer fazer uma música para alguém especial?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#B8AE99]">Conte sua história, aprove a letra e crie um presente que pode ser ouvido para sempre.</p>
          <Link
            href="/criar"
            prefetch={false}
            className="mx-auto mt-5 inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#D4AF55] px-6 py-3 text-sm font-extrabold text-[#090807] transition hover:-translate-y-0.5 hover:bg-[#F5D77E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5D77E]"
          >
            Criar minha música <ArrowRight className="size-4" />
          </Link>
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
    typeof present.order_id === "string" &&
    typeof present.version_id === "string" &&
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
