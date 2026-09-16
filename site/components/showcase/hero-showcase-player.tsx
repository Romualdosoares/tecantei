"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

type HeroShowcaseItem = {
  orderId: string;
  recipientName: string;
  occasion: string;
  style: string;
  title: string;
  durationSeconds: number | null;
};

const equalizerBars = [42, 76, 55, 92, 64, 84, 48, 100, 70, 88, 52, 78, 96, 60, 44, 82, 68, 94, 58, 74, 46, 86, 66, 90];

export function HeroShowcasePlayer({ items }: { items: HeroShowcaseItem[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const continuePlayingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(items[0]?.durationSeconds ?? 0);
  const [error, setError] = useState("");
  const current = items[activeIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !continuePlayingRef.current) return;
    const resume = () => void audio.play().catch(() => setError("Toque no play para continuar."));
    audio.addEventListener("canplay", resume, { once: true });
    audio.load();
    return () => audio.removeEventListener("canplay", resume);
  }, [activeIndex]);

  if (!current) return null;

  const selectTrack = (nextIndex: number, keepPlaying = playing) => {
    const normalized = (nextIndex + items.length) % items.length;
    continuePlayingRef.current = keepPlaying;
    setActiveIndex(normalized);
    setCurrentTime(0);
    setDuration(items[normalized]?.durationSeconds ?? 0);
    setError("");
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    if (audio.paused) {
      continuePlayingRef.current = true;
      await audio.play().catch(() => setError("Não foi possível iniciar o áudio. Tente novamente."));
    } else {
      continuePlayingRef.current = false;
      audio.pause();
    }
  };

  const pauseOtherPlayers = () => {
    document.querySelectorAll<HTMLAudioElement>("audio[data-showcase-player]").forEach((player) => {
      if (player !== audioRef.current) player.pause();
    });
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="my-6 overflow-hidden rounded-[26px] border border-[#D4AF55]/30 bg-[#090807] shadow-[0_18px_55px_rgba(0,0,0,.28)]">
      <audio
        ref={audioRef}
        data-showcase-player
        preload="metadata"
        src={`/api/showcase/${current.orderId}/audio`}
        onPlay={() => {
          pauseOtherPlayers();
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => selectTrack(activeIndex + 1, true)}
        onError={() => {
          setPlaying(false);
          setError("Esta música não pôde ser carregada agora.");
        }}
      >
        Seu navegador não oferece suporte ao player de áudio.
      </audio>

      <div className="relative overflow-hidden border-b border-[#D4AF55]/20 bg-[radial-gradient(circle_at_50%_120%,#4a3818_0,#17130c_43%,#090807_78%)] px-5 pb-5 pt-4">
        <div className="flex items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#D4AF55]">
          <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${playing ? "generation-live-dot bg-emerald-300" : "bg-[#D4AF55]/55"}`} />Músicas criadas</span>
          <span>{activeIndex + 1}/{items.length}</span>
        </div>

        <div className="mt-5 flex h-28 items-center justify-center gap-1.5" aria-hidden="true">
          {equalizerBars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className={`w-1.5 rounded-full bg-gradient-to-t from-[#8C6A2A] via-[#D4AF55] to-[#F5D77E] transition-all duration-300 sm:w-2 ${playing ? "generation-spectrum-bar" : "opacity-55"}`}
              style={{ height: `${playing ? height : Math.max(18, height * 0.38)}%`, animationDelay: `${index * 55}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate font-display text-2xl font-bold text-white">{current.title}</p><p className="mt-1 truncate text-xs font-semibold text-[#B8AE99]">Para {current.recipientName} · {current.style}</p></div>
          <Volume2 className={`mt-1 size-5 shrink-0 text-[#D4AF55] ${playing ? "animate-pulse" : ""}`} />
        </div>

        <input type="range" min={0} max={Math.max(duration, 1)} step={0.1} value={Math.min(currentTime, Math.max(duration, 1))} onChange={(event) => seek(Number(event.target.value))} aria-label={`Progresso de ${current.title}`} className="present-audio-range mt-5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#302A1C] accent-[#D4AF55]" />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-[#B8AE99]"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button type="button" onClick={() => selectTrack(activeIndex - 1)} aria-label="Música anterior" className="grid size-11 place-items-center rounded-full border border-[#D4AF55]/30 text-[#F5D77E] transition hover:bg-[#D4AF55]/10"><SkipBack className="size-4 fill-current" /></button>
          <button type="button" onClick={() => void togglePlayback()} aria-label={playing ? "Pausar música" : "Reproduzir música"} className="grid size-16 place-items-center rounded-full border border-[#F5D77E]/70 bg-[#D4AF55] text-[#090807] shadow-[0_0_32px_rgba(212,175,85,.22)] transition hover:scale-105 hover:bg-[#F5D77E]">{playing ? <Pause className="size-6 fill-current" /> : <Play className="ml-1 size-6 fill-current" />}</button>
          <button type="button" onClick={() => selectTrack(activeIndex + 1)} aria-label="Próxima música" className="grid size-11 place-items-center rounded-full border border-[#D4AF55]/30 text-[#F5D77E] transition hover:bg-[#D4AF55]/10"><SkipForward className="size-4 fill-current" /></button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#D4AF55]/15 pt-4 text-[11px] font-semibold text-[#B8AE99]"><span className="flex min-w-0 items-center gap-2"><AudioLines className="size-4 shrink-0 text-[#D4AF55]" /><span className="truncate">{current.occasion}</span></span><span>Próxima automaticamente</span></div>
        {error && <p className="mt-3 rounded-xl border border-red-300/20 bg-red-200/10 px-3 py-2 text-xs font-semibold text-red-100" role="status">{error}</p>}
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
