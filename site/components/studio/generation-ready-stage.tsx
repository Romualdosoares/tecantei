"use client";

import Link from "next/link";
import { ArrowRight, AudioWaveform, Check, Headphones, Heart, Music2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const waveform = [30, 48, 72, 42, 88, 58, 100, 66, 82, 46, 74, 54, 92, 62, 36, 68, 44, 78, 52, 34];

export function GenerationReadyStage({
  recipient,
  orderId,
  style,
}: {
  recipient: string;
  orderId: string;
  style: string;
}) {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-9 sm:px-8 sm:py-14">
      <div className="relative overflow-hidden rounded-[40px] border border-[#d4af55]/30 bg-[#090807] p-6 text-white shadow-[10px_10px_0_rgba(140,106,42,.08)] sm:p-10 lg:p-14">
        <div className="generation-studio-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border-[54px] border-[#d4af55]/[.07]" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[34px] border border-[#d4af55]/35 bg-[#12110e] p-5 shadow-[8px_8px_0_rgba(140,106,42,.11)]">
            <div className="flex items-center justify-between border-b border-[#d4af55]/20 pb-4 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#b8ae99]">
              <span>Master privado</span>
              <span className="flex items-center gap-2 text-emerald-200"><Check className="size-3.5" /> Finalizado</span>
            </div>
            <div className="relative mt-5 overflow-hidden rounded-[26px] border border-[#d4af55]/20 bg-[#090807] p-6">
              <div className="flex items-center justify-between">
                <div className="grid size-14 place-items-center rounded-2xl border border-[#d4af55]/45 bg-[#1a1813] text-[#f5d77e]">
                  <AudioWaveform className="size-7" />
                </div>
                <Heart className="size-6 fill-[#d4af55] text-[#d4af55]" />
              </div>
              <div className="mt-8 flex h-20 items-center justify-center gap-1" aria-hidden="true">
                {waveform.map((height, index) => (
                  <span key={`${height}-${index}`} className="generation-spectrum-bar w-1.5 rounded-full bg-gradient-to-b from-[#f5d77e] to-[#8c6a2a]" style={{ height: `${height}%`, animationDelay: `${index * 65}ms` }} />
                ))}
              </div>
              <div className="mt-7 flex items-center justify-between border-t border-[#d4af55]/15 pt-4 text-xs text-[#b8ae99]">
                <span>Prévia protegida</span>
                <span className="font-mono text-[#f5d77e]">00:50</span>
              </div>
            </div>
          </div>

          <div>
            <Badge className="border border-emerald-200/20 bg-emerald-300/15 px-4 py-1.5 text-emerald-100 hover:bg-emerald-300/15">
              <Check className="mr-1 size-4" /> 100% · prévia pronta
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-6xl">A história de {recipient || "vocês"} agora tem uma trilha sonora.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Sua amostra exclusiva já está protegida na sua conta. Coloque os fones, aumente o som e prepare o coração para ouvir os primeiros 50 segundos.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#f5d77e]"><Music2 className="size-4" /> Estilo escolhido: {style || "personalizado"}</p>

            <Button asChild size="lg" className="mt-8 h-14 rounded-full bg-[#d4af55] px-8 text-base font-extrabold text-[#090807] transition hover:-translate-y-0.5 hover:bg-[#f5d77e]">
              <Link href={`/pedidos/${orderId}#amostras`}><Headphones /> Ouvir minha amostra agora <ArrowRight /></Link>
            </Button>

            <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold text-white/68">
              <span className="flex items-center gap-2 rounded-full border border-[#d4af55]/20 bg-[#1a1813] px-3 py-2"><ShieldCheck className="size-4 text-emerald-200" /> Áudio privado</span>
              <span className="flex items-center gap-2 rounded-full border border-[#d4af55]/20 bg-[#1a1813] px-3 py-2"><Sparkles className="size-4 text-[#d4af55]" /> 1 ajuste incluído</span>
              <span className="flex items-center gap-2 rounded-full border border-[#d4af55]/20 bg-[#1a1813] px-3 py-2"><Headphones className="size-4 text-[#d4af55]" /> Prévia de 50 segundos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
