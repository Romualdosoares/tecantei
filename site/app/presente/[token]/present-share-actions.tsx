"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Share2, Users } from "lucide-react";

export function PresentShareActions({ recipient, title }: { recipient: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `Escute “${title}”, uma música feita especialmente para ${recipient}.`;

  const copyLink = async () => {
    const copiedSuccessfully = await navigator.clipboard.writeText(window.location.href)
      .then(() => true)
      .catch(() => false);

    setCopied(copiedSuccessfully);
    if (copiedSuccessfully) window.setTimeout(() => setCopied(false), 2500);
  };

  const sharePresent = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Uma música para ${recipient}`,
        text: shareText,
        url: window.location.href,
      }).catch(() => undefined);
      return;
    }

    await copyLink();
  };

  const openSocialShare = (network: "whatsapp" | "facebook") => {
    const url = encodeURIComponent(window.location.href);
    const target = network === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(`${shareText} ${window.location.href}`)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${url}`;

    window.open(target, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="mt-7 rounded-[24px] border border-[#D4AF55]/25 bg-[#17150f] p-4 text-center sm:p-6">
      <div className="mx-auto grid size-11 place-items-center rounded-full border border-[#D4AF55]/35 bg-[#090807]">
        <Share2 className="size-5 text-[#F5D77E]" />
      </div>
      <h2 className="mt-3 font-display text-xl font-semibold text-white">Compartilhe este presente</h2>
      <p className="mx-auto mt-1.5 max-w-lg text-xs leading-5 text-[#B8AE99]">
        Envie esta página para alguém especial ou compartilhe nas suas redes sociais.
      </p>

      <button
        type="button"
        onClick={() => void sharePresent()}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#D4AF55] px-5 py-3 text-sm font-extrabold text-[#090807] transition hover:-translate-y-0.5 hover:bg-[#F5D77E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5D77E]"
      >
        <Share2 className="size-4" /> Compartilhar presente
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => openSocialShare("whatsapp")}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#D4AF55]/30 bg-[#090807] px-2 text-[11px] font-bold text-[#F5D77E] transition hover:border-[#F5D77E] hover:bg-white/5"
        >
          <MessageCircle className="size-3.5" /> WhatsApp
        </button>
        <button
          type="button"
          onClick={() => openSocialShare("facebook")}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#D4AF55]/30 bg-[#090807] px-2 text-[11px] font-bold text-[#F5D77E] transition hover:border-[#F5D77E] hover:bg-white/5"
        >
          <Users className="size-3.5" /> Facebook
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#D4AF55]/30 bg-[#090807] px-2 text-[11px] font-bold text-[#F5D77E] transition hover:border-[#F5D77E] hover:bg-white/5"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar link"}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? "Link do presente copiado." : ""}
      </p>
    </section>
  );
}
