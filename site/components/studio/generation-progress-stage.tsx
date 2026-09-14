"use client";

import Link from "next/link";
import { AudioLines, Check, Clock3, Headphones, Mic2, Music2, Radio, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type GenerationMode = "demo" | "mock" | "live";

const studioSteps = [
  { label: "História recebida", threshold: 1, icon: Sparkles },
  { label: "Melodia e arranjo", threshold: 28, icon: Music2 },
  { label: "Voz e produção", threshold: 58, icon: Radio },
  { label: "Prévia de 50s", threshold: 90, icon: Headphones },
];

const spectrumBars = [36, 58, 82, 48, 72, 100, 64, 88, 52, 76, 42, 68, 92, 56, 34];

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
      <div className="relative overflow-hidden rounded-[38px] border border-[#d4af55]/30 bg-[#090807] text-white shadow-[10px_10px_0_rgba(140,106,42,.08)]">
        <div className="generation-studio-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[42px] border-[#d4af55]/[.07]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#d4af55]/70 to-transparent" />

        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[320px_1fr] lg:items-center lg:p-12">
          <div className="relative mx-auto w-full max-w-[310px] overflow-hidden rounded-[32px] border border-[#d4af55]/35 bg-[#12110e] p-5 shadow-[7px_7px_0_rgba(140,106,42,.11)]">
            <div className="flex items-center justify-between border-b border-[#d4af55]/20 pb-3 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#b8ae99]">
              <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-300 generation-live-dot" /> Sinal ativo</span>
              <span>TC Studio 01</span>
            </div>

            <div className="relative mt-5 grid min-h-52 place-items-center overflow-hidden rounded-[24px] border border-[#d4af55]/20 bg-[#090807] px-5">
              <div className="generation-signal-ring absolute size-40 rounded-full border border-[#d4af55]/18" />
              <div className="generation-signal-ring generation-signal-ring-delayed absolute size-28 rounded-full border border-[#d4af55]/25" />
              <div className="relative z-10 grid size-20 place-items-center rounded-[24px] border border-[#f5d77e]/50 bg-[#1a1813] text-[#f5d77e] shadow-[5px_5px_0_rgba(140,106,42,.16)]">
                <AudioLines className="size-9" />
              </div>
              <span className="absolute left-4 top-4 font-mono text-[0.58rem] tracking-[0.18em] text-[#d4af55]/55">REC / LIVE</span>
              <span className="absolute bottom-4 right-4 font-mono text-[0.58rem] tracking-[0.18em] text-[#d4af55]/55">48 KHZ</span>
            </div>

            <div className="mt-5 flex h-16 items-center justify-center gap-1" aria-hidden="true">
              {spectrumBars.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="generation-spectrum-bar w-1.5 rounded-full bg-gradient-to-b from-[#f5d77e] to-[#8c6a2a]"
                  style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#b8ae99]">
              <span className="flex items-center gap-2"><Mic2 className="size-3.5 text-[#d4af55]" /> Produção vocal</span>
              <span className="font-mono text-[#f5d77e]">{safeProgress.toString().padStart(2, "0")}%</span>
            </div>
          </div>

          <div>
            <Badge className="border border-[#d4af55]/25 bg-[#1a1813] px-4 py-1.5 text-[#f5d77e] hover:bg-[#1a1813]">
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

            <div className="mt-8 rounded-[26px] border border-[#d4af55]/25 bg-[#1a1813] p-5 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d4af55]">Etapa atual</p>
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
                  className="generation-progress-fill relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#8c6a2a] via-[#d4af55] to-[#f5d77e] transition-[width] duration-700 ease-out"
                  style={{ width: `${safeProgress}%` }}
                >
                  <span className="generation-progress-shine absolute inset-0" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {studioSteps.map(({ label, threshold, icon: Icon }) => {
                  const complete = safeProgress >= threshold;
                  return (
                    <div key={label} className={`rounded-2xl border px-3 py-3 transition ${complete ? "border-[#d4af55]/35 bg-[#28241a]" : "border-white/[.06] bg-black/10 text-white/45"}`}>
                      <span className={`grid size-7 place-items-center rounded-full ${complete ? "bg-[#d4af55] text-[#090807]" : "bg-white/10"}`}>
                        {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </span>
                      <p className="mt-2 text-[0.68rem] font-bold leading-4">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2"><Clock3 className="size-4 text-[#d4af55]" /> O progresso chegará a 100% somente com a prévia pronta.</p>
              <Button asChild variant="outline" className="rounded-full border-[#d4af55]/25 bg-[#1a1813] text-white hover:bg-[#28241a] hover:text-white">
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
