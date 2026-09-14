"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Music2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PreviewResponse = {
  url?: string;
  expiresIn?: number;
  error?: string;
};

export function MusicPreviewPlayer({
  orderId,
  versionId,
  label,
  title,
}: {
  orderId: string;
  versionId: string;
  label: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const requestPreview = useCallback(async () => {
    const response = await fetch(
      `/api/orders/${orderId}/versions/${versionId}/preview`,
      { cache: "no-store", credentials: "same-origin" },
    ).catch(() => null);
    const payload = response
      ? await response.json().catch(() => ({} as PreviewResponse)) as PreviewResponse
      : null;

    if (!response?.ok || !payload?.url) {
      return { url: "", error: previewErrorMessage(response?.status, payload?.error) };
    }

    try {
      const signedUrl = new URL(payload.url);
      if (signedUrl.protocol !== "https:") throw new Error("invalid_preview_url");
      return { url: signedUrl.toString(), error: "" };
    } catch {
      return { url: "", error: "Não foi possível abrir esta prévia com segurança." };
    }
  }, [orderId, versionId]);

  useEffect(() => {
    let active = true;
    void requestPreview().then((result) => {
      if (!active) return;
      setAudioUrl(result.url);
      setError(result.error);
      setBusy(false);
    });
    return () => { active = false; };
  }, [requestPreview]);

  const loadPreview = async (startPlaying = false) => {
    setBusy(true);
    setError("");
    const result = await requestPreview();
    setAudioUrl(result.url);
    setError(result.error);
    setBusy(false);
    if (result.url && startPlaying) {
      window.setTimeout(() => void audioRef.current?.play().catch(() => undefined), 0);
    }
  };

  return (
    <article className="rounded-2xl border border-rose-200/80 bg-[#fffaf8] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b2450]">{label}</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-[#2b1722]">{title}</h3>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-100 text-[#8b2450]">
          <Music2 className="size-5" />
        </span>
      </div>

      {busy && (
        <div className="mt-5 flex min-h-14 items-center gap-3 rounded-xl bg-white px-4 text-sm font-semibold text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin text-[#8b2450]" /> Preparando player seguro...
        </div>
      )}

      {!busy && audioUrl && (
        <div className="mt-5">
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            src={audioUrl}
            controlsList="nodownload noplaybackrate"
            className="h-12 w-full"
            onError={() => {
              setAudioUrl("");
              setError("O acesso temporário expirou. Recarregue a prévia para continuar.");
            }}
          >
            Seu navegador não oferece suporte à reprodução de áudio.
          </audio>
          <p className="mt-2 text-xs text-muted-foreground">Trecho privado de até 50 segundos.</p>
        </div>
      )}

      {!busy && error && (
        <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-950" role="alert">
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full bg-white" onClick={() => void loadPreview(true)}>
            <RefreshCw /> Recarregar prévia
          </Button>
        </div>
      )}

      {!busy && !audioUrl && !error && (
        <Button type="button" variant="outline" className="mt-5 w-full rounded-full" onClick={() => void loadPreview(true)}>
          <Play /> Ouvir prévia
        </Button>
      )}
    </article>
  );
}

function previewErrorMessage(status?: number, code?: string) {
  if (status === 410 || code === "preview_expired") {
    return "O período desta prévia terminou. Fale com o suporte para verificar o pedido.";
  }
  if (status === 401 || code === "authentication_required") {
    return "Sua sessão expirou. Entre novamente para ouvir a prévia.";
  }
  if (status === 404 || code === "not_found") {
    return "A prévia ainda não está disponível para esta versão.";
  }
  return "Não foi possível carregar a prévia agora. Tente novamente.";
}
