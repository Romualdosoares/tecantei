"use client";

import Link from "next/link";
import { ArrowRight, Check, Headphones, Heart, Music2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#260b19] via-[#521631] to-[#8b2450] p-6 text-white shadow-[0_34px_110px_rgba(63,15,39,.3)] sm:p-10 lg:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border-[54px] border-white/[.05]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-80 rounded-full bg-rose-300/15 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative mx-auto grid size-64 place-items-center sm:size-80">
            <div className="absolute inset-0 rounded-full bg-rose-300/20 blur-2xl generation-vinyl-glow" />
            <div className="absolute inset-3 rounded-full bg-[repeating-radial-gradient(circle_at_center,#17060f_0,#17060f_4px,#3a1025_5px,#17060f_9px)] shadow-2xl">
              <div className="absolute inset-[32%] grid place-items-center rounded-full border-4 border-white/25 bg-gradient-to-br from-[#e57e9e] to-[#7e2148]">
                <Heart className="size-11 fill-white text-white" />
              </div>
            </div>
            <div className="absolute bottom-2 right-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl backdrop-blur">
              <div className="flex h-8 items-center gap-1">
                {[30, 55, 82, 48, 95, 62, 38, 76, 52, 88, 44, 68].map((height, index) => (
                  <span key={index} className="w-1 rounded-full bg-rose-200 wave-animated" style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
                ))}
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
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-rose-100"><Music2 className="size-4" /> Estilo escolhido: {style || "personalizado"}</p>

            <Button asChild size="lg" className="mt-8 h-14 rounded-full bg-white px-8 text-base font-extrabold text-[#551732] shadow-xl transition hover:scale-[1.03] hover:bg-rose-50">
              <Link href={`/pedidos/${orderId}#amostras`}><Headphones /> Ouvir minha amostra agora <ArrowRight /></Link>
            </Button>

            <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold text-white/68">
              <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-3 py-2"><ShieldCheck className="size-4 text-emerald-200" /> Áudio privado</span>
              <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-3 py-2"><Sparkles className="size-4 text-rose-200" /> 1 ajuste incluído</span>
              <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-3 py-2"><Headphones className="size-4 text-rose-200" /> Prévia de 50 segundos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
