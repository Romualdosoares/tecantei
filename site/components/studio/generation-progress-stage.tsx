"use client";

import Link from "next/link";
import { Check, Clock3, Headphones, Music2, Radio, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type GenerationMode = "demo" | "mock" | "live";

const studioSteps = [
  { label: "História recebida", threshold: 1, icon: Sparkles },
  { label: "Melodia e arranjo", threshold: 28, icon: Music2 },
  { label: "Voz e produção", threshold: 58, icon: Radio },
  { label: "Prévia de 50s", threshold: 90, icon: Headphones },
];

export function GenerationProgressStage({
  recipient,
  progress,
  mode,
  taskStatus,
  pollingWarning,
}: {
  recipient: string;
  progress: number;
  mode: GenerationMode;
  taskStatus: string | null;
  pollingWarning: boolean;
}) {
  const phase = progressPhase(progress, taskStatus);
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const isLive = mode === "live";

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute left-0 top-10 size-72 rounded-full bg-rose-300/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-80 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#260b19] via-[#541834] to-[#7b2448] text-white shadow-[0_32px_100px_rgba(63,15,39,.28)]">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[42px] border-white/[.04]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-rose-400/10 blur-3xl" />

        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[320px_1fr] lg:items-center lg:p-12">
          <div className="relative mx-auto grid size-64 place-items-center sm:size-72">
            <div className="absolute inset-4 rounded-full bg-rose-300/20 blur-2xl generation-vinyl-glow" />
            <div className="absolute inset-0 rounded-full border border-white/10 bg-[repeating-radial-gradient(circle_at_center,#180710_0,#180710_3px,#321020_4px,#180710_7px)] shadow-2xl animate-spin-slow">
              <div className="absolute inset-[36%] grid place-items-center rounded-full border-4 border-[#f7bdca]/35 bg-gradient-to-br from-[#b94970] to-[#6f1c40] shadow-inner">
                <Music2 className="size-8 text-white" />
              </div>
            </div>
            <div className="absolute -right-2 top-2 h-40 w-3 origin-top rotate-[24deg] rounded-full bg-gradient-to-b from-[#eadfe2] to-[#8c7380] shadow-lg" />
            <div className="absolute right-6 top-4 size-7 rounded-full border-4 border-white/50 bg-[#321020]" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/30 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
              Estúdio Te Cantei
            </div>
          </div>

          <div>
            <Badge className="border border-white/15 bg-white/10 px-4 py-1.5 text-white hover:bg-white/10">
              <span className="mr-2 size-2 rounded-full bg-emerald-300 generation-live-dot" />
              {isLive ? "Produção real em andamento" : "Modo de demonstração · sem geração real"}
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Sua história está ganhando voz, {recipient || "com carinho"}.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
              {isLive
                ? "Estamos transformando seus detalhes em melodia, interpretação e emoção. Você pode sair desta tela: o pedido continuará salvo em sua conta."
                : "Esta demonstração mostra como a criação avança por cada etapa. Nenhuma chamada musical paga está sendo realizada neste modo."}
            </p>

            <div className="mt-8 rounded-[26px] border border-white/12 bg-white/[.08] p-5 backdrop-blur sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-200">Etapa atual</p>
                  <p className="mt-1 text-sm font-semibold sm:text-base" aria-live="polite">{phase}</p>
                </div>
                <p className="font-display text-4xl font-bold tabular-nums text-white">{safeProgress}%</p>
              </div>

              <div
                className="mt-5 h-4 overflow-hidden rounded-full border border-white/10 bg-black/25 p-0.5"
                role="progressbar"
                aria-label="Progresso da criação musical"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={safeProgress}
              >
                <div
                  className="generation-progress-fill relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#ff9fba] via-[#ffcfda] to-white transition-[width] duration-700 ease-out"
                  style={{ width: `${safeProgress}%` }}
                >
                  <span className="generation-progress-shine absolute inset-0" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {studioSteps.map(({ label, threshold, icon: Icon }) => {
                  const complete = safeProgress >= threshold;
                  return (
                    <div key={label} className={`rounded-2xl border px-3 py-3 transition ${complete ? "border-rose-200/25 bg-white/12" : "border-white/[.06] bg-black/10 text-white/45"}`}>
                      <span className={`grid size-7 place-items-center rounded-full ${complete ? "bg-rose-200 text-[#5b1736]" : "bg-white/10"}`}>
                        {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </span>
                      <p className="mt-2 text-[0.68rem] font-bold leading-4">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2"><Clock3 className="size-4 text-rose-200" /> O progresso chegará a 100% somente com a prévia pronta.</p>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/pedidos"><WandSparkles /> Acompanhar em Meus pedidos</Link>
              </Button>
            </div>

            {pollingWarning && isLive && (
              <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-100/10 px-4 py-3 text-xs text-amber-100" role="status">
                A conexão de acompanhamento oscilou, mas a criação continua no servidor. Tentaremos atualizar novamente automaticamente.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function progressPhase(progress: number, taskStatus: string | null) {
  if (progress >= 100) return "Prévia pronta para ouvir";
  if (taskStatus === "reconciling") return "Confirmando o processamento com o estúdio";
  if (progress < 16) return "Recebendo sua história e preparando a composição";
  if (progress < 38) return "Criando melodia, acordes e direção musical";
  if (progress < 66) return "Trabalhando voz, interpretação e arranjos";
  if (progress < 90) return "Produzindo, equilibrando e mixando sua música";
  return "Finalizando e protegendo sua prévia de 50 segundos";
}
