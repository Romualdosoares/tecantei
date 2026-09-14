"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, Gift, Heart, LoaderCircle, Music2, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DeliveryExperience({ orderId, recipient, title, durationSeconds, initialDedication, initialShareActive }: {
  orderId: string;
  recipient: string;
  title: string;
  durationSeconds: number | null;
  initialDedication: string;
  initialShareActive: boolean;
}) {
  const [audioUrl, setAudioUrl] = useState("");
  const [dedication, setDedication] = useState(initialDedication);
  const [shareUrl, setShareUrl] = useState("");
  const [shareActive, setShareActive] = useState(initialShareActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/orders/${orderId}/audio?mode=stream`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("audio_unavailable");
        return response.json() as Promise<{ url?: string }>;
      })
      .then((payload) => {
        if (payload.url) setAudioUrl(payload.url);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("Não foi possível abrir o player agora. O botão de download continua disponível.");
      });
    return () => controller.abort();
  }, [orderId]);

  const download = async () => {
    setBusy(true); setError("");
    const response = await fetch(`/api/orders/${orderId}/audio`, { cache: "no-store" }).catch(() => null);
    const payload = response?.ok ? await response.json().catch(() => null) as { url?: string } | null : null;
    setBusy(false);
    if (!payload?.url) { setError("Não foi possível preparar o download. Tente novamente."); return; }
    window.location.assign(payload.url);
  };

  const createShare = async () => {
    if (!dedication.trim()) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/orders/${orderId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dedication }),
    }).catch(() => null);
    const payload = response?.ok ? await response.json().catch(() => null) as { shareUrl?: string } | null : null;
    setBusy(false);
    if (!payload?.shareUrl) { setError("Não foi possível criar o link privado do presente."); return; }
    setShareUrl(payload.shareUrl);
    setShareActive(true);
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  const sharePresent = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      await navigator.share({ title: `Uma música para ${recipient}`, text: "Preparei este presente especialmente para você.", url: shareUrl }).catch(() => undefined);
      return;
    }
    await copyShare();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className="tc-premium-frame overflow-hidden rounded-[32px] border border-primary/35 bg-card">
        <div className="relative overflow-hidden border-b border-primary/20 bg-[#15130f] p-7 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full border-[34px] border-primary/15" />
          <Badge className="relative rounded-full bg-primary text-primary-foreground hover:bg-primary"><CheckCircle2 /> Pagamento confirmado</Badge>
          <Heart className="relative mt-10 size-10 fill-primary text-primary" />
          <p className="relative mt-5 text-xs font-bold uppercase tracking-[.18em] text-white/60">Sua música completa está pronta</p>
          <h1 className="relative mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
          <p className="relative mt-3 text-white/70">Criada especialmente para {recipient} · {formatDuration(durationSeconds)}</p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full border border-primary/35 bg-primary/10"><Music2 className="text-primary" /></span><div><p className="font-display text-xl font-bold">Ouça a música inteira</p><p className="text-sm text-muted-foreground">Áudio privado em alta qualidade</p></div></div>
          {audioUrl ? <audio controls preload="metadata" src={audioUrl} className="mt-6 w-full">Seu navegador não oferece suporte ao áudio.</audio> : <div className="mt-6 h-14 animate-pulse rounded-full border border-primary/20 bg-muted" />}
          <Button type="button" className="mt-6 w-full rounded-full" disabled={busy} onClick={() => void download()}>{busy ? <LoaderCircle className="animate-spin" /> : <Download />} Baixar música em MP3</Button>
        </div>
      </section>

      <section className="tc-premium-frame rounded-[32px] border border-primary/35 bg-card p-6 sm:p-8">
        <Badge variant="outline" className="rounded-full"><Gift /> Transforme em presente</Badge>
        <h2 className="mt-4 font-display text-3xl font-bold">Uma página bonita para quem você ama</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Escreva uma dedicatória e gere um link privado para enviar pelo WhatsApp. A história usada na criação permanece em segredo.</p>
        <label className="mt-6 block space-y-2 text-sm font-semibold">Mensagem para {recipient}<Textarea value={dedication} onChange={(event) => setDedication(event.target.value)} minLength={1} maxLength={500} className="min-h-32" /><span className="block text-right text-xs font-normal text-muted-foreground">{dedication.length}/500</span></label>
        <Button type="button" className="mt-4 w-full rounded-full" disabled={busy || !dedication.trim()} onClick={() => void createShare()}>{busy ? <LoaderCircle className="animate-spin" /> : <Gift />} {shareActive ? "Gerar novo link do presente" : "Criar página do presente"}</Button>
        {shareActive && !shareUrl && <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">Já existe um link ativo. Gere um novo para copiá-lo; o endereço anterior será invalidado por segurança.</p>}
        {shareUrl && <div className="mt-5 space-y-3 rounded-2xl border border-primary/25 bg-muted/40 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Link privado pronto</p><div className="flex gap-2"><Input readOnly value={shareUrl} className="min-w-0 flex-1" /><Button type="button" variant="outline" onClick={() => void copyShare()}><Copy /> {copied ? "Copiado" : "Copiar"}</Button></div><Button type="button" variant="outline" className="w-full rounded-full" onClick={() => void sharePresent()}><Share2 /> Compartilhar presente</Button></div>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "música personalizada";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
