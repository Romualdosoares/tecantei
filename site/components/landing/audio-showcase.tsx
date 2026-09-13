"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Music, Volume2, Sparkles, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SampleSong = {
  id: string;
  title: string;
  recipient: string;
  occasion: string;
  style: string;
  genreColor: string;
  snippet: string;
  lyricsHighlight: string;
  duration: string;
  frequencies: number[]; // chord frequencies for real Web Audio synthesis
};

const samples: SampleSong[] = [
  {
    id: "mpb",
    title: "Café das Nove",
    recipient: "Camila",
    occasion: "5 anos de casados",
    style: "MPB Romântico",
    genreColor: "from-rose-500/20 to-pink-600/30 border-rose-300/40 text-rose-800",
    snippet: "Voz suave, violão de nylon e piano intimista que arrepiam no primeiro acorde.",
    lyricsHighlight: "“Foi no café das nove naquele domingo cinza / Que o seu sorriso fez meu mundo inteiro ter cor...”",
    duration: "0:50",
    frequencies: [261.63, 329.63, 392.00, 523.25], // C major
  },
  {
    id: "pop",
    title: "O Mundo Ficou Mais Bonito",
    recipient: "Lucas",
    occasion: "Aniversário de Namoro",
    style: "Pop Acústico",
    genreColor: "from-amber-500/20 to-rose-600/30 border-amber-300/40 text-amber-900",
    snippet: "Arranjo moderno, violão com ritmo pulsante e refrão emocionante e marcante.",
    lyricsHighlight: "“Nem todo o mapa do mundo tem seu abraço / Você é meu destino em cada pedaço...”",
    duration: "0:50",
    frequencies: [293.66, 369.99, 440.00, 587.33], // D major
  },
  {
    id: "sertanejo",
    title: "Nosso Primeiro Sim",
    recipient: "Juliana",
    occasion: "Pedido de Casamento",
    style: "Sertanejo Emocionante",
    genreColor: "from-orange-500/20 to-amber-600/30 border-orange-300/40 text-orange-950",
    snippet: "Sensibilidade profunda, violão 12 cordas e refrão comovente feito para chorar de emoção.",
    lyricsHighlight: "“Eu guardei cada detalhe que você falou / O amor da minha vida finalmente chegou...”",
    duration: "0:50",
    frequencies: [220.00, 277.18, 329.63, 440.00], // A major
  },
  {
    id: "pagode",
    title: "Dueto Perfeito",
    recipient: "Bruno & Carol",
    occasion: "Bodas de Papel",
    style: "Pagode Romântico",
    genreColor: "from-fuchsia-500/20 to-rose-600/30 border-fuchsia-300/40 text-fuchsia-950",
    snippet: "Cavaquinho cadenciado, percussão suave e harmonia que faz todo mundo cantar junto.",
    lyricsHighlight: "“Quem vê a gente rindo não imagina o valor / Que essa nossa história tem de pura paz e amor...”",
    duration: "0:50",
    frequencies: [246.94, 311.13, 369.99, 493.88], // B major
  },
];

export function AudioShowcase({ onStartCreating }: { onStartCreating?: (style: string) => void }) {
  const [activeSampleId, setActiveSampleId] = useState<string>("mpb");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSample = samples.find((s) => s.id === activeSampleId) || samples[0];

  // Stop audio synthesis
  const stopAudio = () => {
    try {
      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      oscillatorsRef.current = [];
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch {
      // ignore
    }
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Play pleasant acoustic tone arpeggio with Web Audio API
  const startAudio = (sample: SampleSong) => {
    stopAudio();

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.12, ctx.currentTime);
      mainGain.connect(ctx.destination);
      gainNodeRef.current = mainGain;

      // Create gentle harmonics for acoustic warmth
      const oscs: OscillatorNode[] = [];
      sample.frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        // Warm triangle wave for soothing vocal/instrument feel
        osc.type = idx % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // LFO subtle vibrato
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 4.5;
        lfoGain.gain.value = 2.0;
        lfo.connect(osc.frequency);
        lfo.start();

        noteGain.gain.setValueAtTime(0.08 / (idx + 1), ctx.currentTime);
        osc.connect(noteGain);
        noteGain.connect(mainGain);

        osc.start();
        oscs.push(osc);
      });

      oscillatorsRef.current = oscs;
      setIsPlaying(true);

      // Playback progress ticker up to 50 seconds
      intervalRef.current = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= 50) {
            stopAudio();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      // Fallback: visual playback only if audio context is blocked
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setPlaybackTime((prev) => (prev >= 50 ? 0 : prev + 1));
      }, 1000);
    }
  };

  const togglePlay = (sample: SampleSong) => {
    if (isPlaying && activeSampleId === sample.id) {
      stopAudio();
    } else {
      setActiveSampleId(sample.id);
      setPlaybackTime(0);
      startAudio(sample);
    }
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  return (
    <section className="relative my-16 overflow-hidden rounded-[36px] border border-rose-200/60 bg-gradient-to-b from-white/95 via-[#fff8f5]/90 to-[#fdf2f4]/80 p-6 sm:p-10 lg:p-14 shadow-[0_20px_60px_-15px_rgba(139,36,80,0.08)]">
      {/* Glow aura */}
      <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-rose-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 size-80 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-rose-900 shadow-sm backdrop-blur-sm">
          <Sparkles className="size-3.5 text-rose-600" />
          <span>OUÇA ANTES DE CRIAR</span>
        </div>

        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-[#2b1722]">
          Ouça como histórias reais viram canções inesquecíveis.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground">
          Cada verso é escrito com as memórias de quem presenteia. Dê o play e sinta a qualidade da voz, letra e melodia.
        </p>

        {/* Style selection tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {samples.map((sample) => {
            const isSelected = activeSampleId === sample.id;
            return (
              <button
                key={sample.id}
                onClick={() => {
                  if (activeSampleId !== sample.id) {
                    setActiveSampleId(sample.id);
                    setPlaybackTime(0);
                    if (isPlaying) {
                      startAudio(sample);
                    }
                  }
                }}
                className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-[#2b1722] text-white shadow-md shadow-[#2b1722]/20 scale-105"
                    : "bg-white/80 text-muted-foreground border border-rose-100 hover:border-rose-300 hover:text-foreground"
                }`}
              >
                <Music className={`size-4 ${isSelected ? "text-rose-300" : "text-muted-foreground"}`} />
                <span>{sample.style}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Audio Player Card */}
        <div className="mt-8 overflow-hidden rounded-[28px] border border-rose-200/80 bg-white/90 p-6 sm:p-8 lg:p-10 shadow-xl shadow-rose-900/5 backdrop-blur-xl">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            {/* Left Column: Player controls & Waveform */}
            <div className="text-left">
              <div className="flex items-center justify-between">
                <Badge className="rounded-full bg-rose-100/90 text-rose-900 hover:bg-rose-100/90 border-0 px-3 py-1 font-medium text-xs">
                  {currentSample.occasion}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium bg-rose-50 px-3 py-1 rounded-full">
                  <Volume2 className="size-3.5" />
                  <span>Áudio demonstrativo</span>
                </div>
              </div>

              <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-[#2b1722]">
                {currentSample.title}
              </h3>
              <p className="text-sm font-medium text-rose-800">
                Feita para <span className="font-semibold underline decoration-rose-400 underline-offset-4">{currentSample.recipient}</span> · Estilo {currentSample.style}
              </p>

              {/* Soundwaves visualizer */}
              <div className="mt-6 flex h-14 items-center gap-1.5 rounded-2xl bg-[#fff8f5] p-3 border border-rose-100">
                {Array.from({ length: 32 }).map((_, i) => {
                  const heights = [35, 60, 85, 45, 75, 95, 50, 70, 40, 80, 100, 65, 45, 85, 55, 90, 70, 40, 60, 95, 50, 80, 65, 40, 75, 90, 50, 60, 85, 45, 70, 30];
                  const height = heights[i % heights.length];
                  const progressPct = (playbackTime / 50) * 32;
                  const isCurrent = i <= progressPct;

                  return (
                    <span
                      key={i}
                      className={`w-full rounded-full transition-all duration-300 ${
                        isCurrent && isPlaying
                          ? "bg-gradient-to-t from-rose-600 to-pink-500 wave-animated"
                          : isCurrent
                          ? "bg-rose-600"
                          : "bg-rose-200/70"
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(20, height * 0.9)}%` : `${Math.max(16, height * 0.45)}%`,
                        animationDelay: `${(i % 5) * 0.15}s`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Controls bar */}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>0:{playbackTime < 10 ? `0${playbackTime}` : playbackTime}</span>
                <span>{currentSample.duration} (Prévia)</span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => togglePlay(currentSample)}
                  className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-900/20 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="size-5 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-5 fill-current ml-0.5" />
                      <span>Ouvir demonstração</span>
                    </>
                  )}
                </button>

                {onStartCreating && (
                  <button
                    type="button"
                    onClick={() => onStartCreating(currentSample.style)}
                    className="text-sm font-semibold text-rose-800 hover:text-rose-950 underline underline-offset-4 transition"
                  >
                    Quero uma nesse estilo →
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Emotional Lyrics parchment */}
            <div className="relative rounded-2xl border border-rose-200/70 bg-[#fffbfa] p-6 shadow-sm">
              <div className="absolute -right-3 -top-3">
                <span className="grid size-8 place-items-center rounded-full bg-rose-100 text-rose-700 shadow-sm">
                  <Heart className="size-4 fill-rose-500 text-rose-500" />
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-700/80">Trecho da Letra</p>
              <blockquote className="mt-3 font-display text-lg italic leading-relaxed text-[#3b1928]">
                {currentSample.lyricsHighlight}
              </blockquote>
              <p className="mt-4 text-xs text-muted-foreground leading-5">
                {currentSample.snippet}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
