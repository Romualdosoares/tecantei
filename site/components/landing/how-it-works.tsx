"use client";

import { Feather, CheckCheck, Gift, Sparkles, ShieldCheck, HeartHandshake } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Conte a história de vocês",
    description:
      "Diga para quem é, escolha a ocasião e escreva sobre momentos especiais, manias, viagens, piadas internas e o que você sente.",
    icon: Feather,
    highlight: "Sem complicação",
    gradient: "from-rose-50 to-pink-50 border-rose-200/80",
    iconBg: "bg-rose-500 text-white",
  },
  {
    step: "02",
    title: "Você aprova a letra antes de gravar",
    description:
      "Nossa inteligência transforma a história em versos poéticos rimados. Você pode editar, trocar palavras e aprovar cada linha com calma.",
    icon: CheckCheck,
    highlight: "Controle total",
    gradient: "from-amber-50 to-orange-50 border-amber-200/80",
    iconBg: "bg-amber-600 text-white",
  },
  {
    step: "03",
    title: "Ouça a prévia e receba o presente",
    description:
      "Uma melodia exclusiva é produzida em minutos. Você ouve 50 segundos de prévia, tem 1 ajuste de estilo gratuito e recebe a página do presente.",
    icon: Gift,
    highlight: "1 ajuste grátis",
    gradient: "from-pink-50 to-purple-50 border-pink-200/80",
    iconBg: "bg-purple-600 text-white",
  },
];

export function HowItWorks() {
  return (
    <section className="relative my-20 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/90 px-4 py-1.5 text-xs font-semibold tracking-wide text-rose-900 shadow-sm">
            <Sparkles className="size-3.5 text-rose-600" />
            <span>PASSO A PASSO SIMPLES</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-[#2b1722]">
            Como sua história se transforma em música
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Você não precisa saber nada de música ou rima. Nós cuidamos de toda a poesia e harmonia com você no controle de tudo.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={`relative flex flex-col justify-between overflow-hidden rounded-[28px] border bg-gradient-to-b ${item.gradient} p-7 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-4xl font-extrabold text-black/15">
                      {item.step}
                    </span>
                    <span className={`grid size-12 place-items-center rounded-2xl shadow-md ${item.iconBg}`}>
                      <Icon className="size-6" />
                    </span>
                  </div>

                  <div className="mt-6">
                    <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-rose-900 shadow-sm">
                      {item.highlight}
                    </span>
                    <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-[#2b1722]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-black/5 text-xs font-medium text-rose-950/70 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>Garantia de privacidade e respeito à sua história</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reassurance banner */}
        <div className="mt-10 flex flex-wrap items-center justify-around gap-6 rounded-2xl border border-rose-200/60 bg-white/70 p-6 backdrop-blur-md text-sm text-[#2b1722] font-medium shadow-sm">
          <div className="flex items-center gap-3">
            <HeartHandshake className="size-5 text-rose-600" />
            <span>Mais de 1.200 canções entregues</span>
          </div>
          <div className="h-4 w-px bg-rose-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-amber-600" />
            <span>Letra sempre aprovada antes</span>
          </div>
          <div className="h-4 w-px bg-rose-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-600" />
            <span>Página de presente privada</span>
          </div>
        </div>
      </div>
    </section>
  );
}
