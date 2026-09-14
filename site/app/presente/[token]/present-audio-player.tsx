"use client";

import { useRef, useState } from "react";
import { Download, Pause, Play, Volume2 } from "lucide-react";

export function PresentAudioPlayer({
  audioUrl,
  downloadUrl,
  title,
  durationSeconds,
}: {
  audioUrl: string;
  downloadUrl: string;
  title: string;
  durationSeconds: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="rounded-[26px] border border-[#D4AF55]/35 bg-[#1A1813] p-4 sm:p-5">
      <audio
        ref={audioRef}
        preload="metadata"
        src={audioUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      >
        Seu navegador não oferece suporte ao player de áudio.
      </audio>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={playing ? "Pausar música" : "Reproduzir música"}
          className="grid size-14 shrink-0 place-items-center rounded-full border border-[#F5D77E]/70 bg-[#D4AF55] text-[#090807] hover:-translate-y-0.5 hover:bg-[#F5D77E]"
        >
          {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#D4AF55]">
                <Volume2 className="size-3" /> Tocando seu presente
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs text-[#B8AE99]">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Progresso da música"
            className="present-audio-range mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#302a1c] accent-[#D4AF55]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#D4AF55]/15 pt-4">
        <p className="text-[11px] leading-5 text-[#8f8777]">Ouça quantas vezes quiser e guarde esta lembrança.</p>
        <a
          href={downloadUrl}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#D4AF55]/40 px-4 py-2 text-xs font-bold text-[#F5D77E] hover:-translate-y-0.5 hover:border-[#F5D77E] hover:bg-[#D4AF55]/10"
        >
          <Download className="size-3.5" /> Baixar música
        </a>
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
