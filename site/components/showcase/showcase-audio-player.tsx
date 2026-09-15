"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function ShowcaseAudioPlayer({
  src,
  title,
  durationSeconds,
}: {
  src: string;
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

  const pauseOtherPlayers = () => {
    document.querySelectorAll<HTMLAudioElement>("audio[data-showcase-player]").forEach((other) => {
      if (other !== audioRef.current) other.pause();
    });
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="rounded-2xl border border-[#D4AF55]/25 bg-[#090807] p-3.5">
      <audio
        ref={audioRef}
        data-showcase-player
        preload="none"
        src={src}
        onPlay={() => {
          pauseOtherPlayers();
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      >
        Seu navegador não oferece suporte ao player de áudio.
      </audio>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={playing ? `Pausar ${title}` : `Ouvir ${title}`}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-[#F5D77E]/70 bg-[#D4AF55] text-[#090807] transition hover:-translate-y-0.5 hover:bg-[#F5D77E]"
        >
          {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label={`Progresso de ${title}`}
            className="present-audio-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#302a1c] accent-[#D4AF55]"
          />
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-[#B8AE99]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}
