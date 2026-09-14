"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Copy, Download, Gift, LoaderCircle, Music2, Play, Save, Share2, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MUSIC_STYLE_OPTIONS, VOICE_OPTIONS, type VoicePreference } from "@/lib/order-options";
import { MusicPreviewPlayer } from "./music-preview-player";

const recipientOptions = [
  "Esposo(a)",
  "Namorado(a)",
  "Reconciliação",
  "Noivo(a)",
  "Crush/Paixão",
  "Amigo(a)",
  "Mãe",
  "Pai",
  "Filho(a)",
  "Irmão(ã)",
  "Eu mesmo",
  "Outro",
] as const;
const editableStatuses = new Set(["draft", "lyrics_review", "lyrics_approved"]);

type OrderRecord = {
  id: string;
  status: string;
  adjustment_status: string;
  occasion: string;
  recipient_name: string;
  pronunciation: string | null;
  story: string;
  style: string;
  voice_preference: VoicePreference;
  updated_at: string;
};

type LyricRecord = {
  id: string;
  kind: "source" | "proposed" | "approved";
  revision: number;
  content: string;
  created_at: string;
};

type MusicVersionRecord = {
  id: string;
  origin: "original" | "adjustment";
  status: string;
  title: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export function OrderEditor({
  order,
  latestSource,
  latestProposed,
  latestApproved,
  revisionCounts,
  generationTask,
  musicVersions,
  adjustmentRequest,
  selection,
  paymentIntent,
  delivery,
}: {
  order: OrderRecord;
  latestSource: LyricRecord | null;
  latestProposed: LyricRecord | null;
  latestApproved: LyricRecord | null;
  revisionCounts: { source: number; proposed: number; approved: number };
  generationTask: { status: string; model: string; updated_at: string } | null;
  musicVersions: MusicVersionRecord[];
  adjustmentRequest: { id: string; source_version_id: string; status: string; customer_notes: string; updated_at: string } | null;
  selection: { version_id: string; selected_at: string } | null;
  paymentIntent: { id: string; version_id: string; provider: string; status: string; amount_cents: number; currency: string; created_at: string } | null;
  delivery: { id: string; version_id: string; dedication: string | null; share_enabled_at: string | null; revoked_at: string | null; first_accessed_at: string | null } | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const orderUsesRecipientOption = recipientOptions.some((item) => item === order.occasion) && order.occasion !== "Outro";
  const [occasion, setOccasion] = useState(orderUsesRecipientOption ? order.occasion : "Outro");
  const [customOccasion, setCustomOccasion] = useState(orderUsesRecipientOption ? "" : order.occasion);
  const [recipient, setRecipient] = useState(order.recipient_name);
  const [pronunciation, setPronunciation] = useState(order.pronunciation ?? "");
  const [story, setStory] = useState(latestSource?.content ?? order.story);
  const initialLyrics = latestProposed?.content ?? latestApproved?.content ?? "";
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [savedLyrics, setSavedLyrics] = useState(initialLyrics);
  const [proposedId, setProposedId] = useState(latestProposed?.id ?? null);
  const orderUsesPresetStyle = MUSIC_STYLE_OPTIONS.some((item) => item === order.style) && order.style !== "Outro";
  const [style, setStyle] = useState(orderUsesPresetStyle ? order.style : "Outro");
  const [customStyle, setCustomStyle] = useState(orderUsesPresetStyle ? "" : order.style);
  const [voicePreference, setVoicePreference] = useState<VoicePreference>(order.voice_preference);
  const effectiveOccasion = occasion === "Outro" ? customOccasion.trim() : occasion;
  const effectiveStyle = style === "Outro" ? customStyle.trim() : style;
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [lyricsBusy, setLyricsBusy] = useState(false);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);
  const [adjustmentStatus, setAdjustmentStatus] = useState(order.adjustment_status);
  const readyVersions = musicVersions.filter((version) => version.status === "ready");
  const firstOriginal = readyVersions.find((version) => version.origin === "original");
  const [sourceVersionId, setSourceVersionId] = useState(
    adjustmentRequest?.source_version_id ?? firstOriginal?.id ?? readyVersions[0]?.id ?? "",
  );
  const [adjustmentNotes, setAdjustmentNotes] = useState(adjustmentRequest?.customer_notes ?? "");
  const [selectedVersionId, setSelectedVersionId] = useState(
    selection?.version_id ?? firstOriginal?.id ?? readyVersions[0]?.id ?? "",
  );
  const [checkoutRequestId, setCheckoutRequestId] = useState(() => crypto.randomUUID());
  const [paymentEventId, setPaymentEventId] = useState(() => crypto.randomUUID());
  const [paymentIntentId, setPaymentIntentId] = useState(paymentIntent?.id ?? null);
  const [paymentStatus, setPaymentStatus] = useState(paymentIntent?.status ?? null);
  const [paymentMode, setPaymentMode] = useState<"mock" | "live" | null>(paymentIntent ? paymentIntent.provider === "mock" ? "mock" : "live" : null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(paymentIntent?.provider ?? null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixCheckoutUrl, setPixCheckoutUrl] = useState<string | null>(null);
  const [pixExpiresAt, setPixExpiresAt] = useState<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [dedication, setDedication] = useState(
    delivery?.dedication ?? "Fiz esta música especialmente para você.",
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareActive, setShareActive] = useState(
    Boolean(delivery?.share_enabled_at && !delivery.revoked_at),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editable = editableStatuses.has(status);

  const saveBriefing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBriefingBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/briefing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occasion: effectiveOccasion, recipient, pronunciation, story, style: effectiveStyle, voicePreference }),
    }).catch(() => null);
    setBriefingBusy(false);
    if (!response?.ok) {
      setError("Não foi possível salvar a revisão da história.");
      return;
    }
    setStatus("draft");
    setMessage("Nova revisão da história salva. A letra precisa ser revisada novamente.");
    router.refresh();
  };

  const saveLyricsRevision = async () => {
    if (lyrics === savedLyrics) {
      setError("Edite a letra antes de criar uma nova revisão.");
      return;
    }
    setLyricsBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/lyrics/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lyrics }),
    }).catch(() => null);
    setLyricsBusy(false);
    if (!response?.ok) {
      setError("Não foi possível salvar a nova versão da letra.");
      return;
    }
    const data = await response.json() as { proposed_lyric_id?: string };
    if (!data.proposed_lyric_id) {
      setError("A revisão não retornou um identificador válido.");
      return;
    }
    setSavedLyrics(lyrics);
    setProposedId(data.proposed_lyric_id);
    setStatus("lyrics_review");
    setMessage("Nova versão da letra salva para aprovação.");
    router.refresh();
  };

  const approveLyrics = async () => {
    if (!proposedId || status !== "lyrics_review" || lyrics !== savedLyrics) {
      setError("Salve a versão mais recente da letra antes de aprová-la.");
      return;
    }
    setLyricsBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/lyrics/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposedLyricId: proposedId }),
    }).catch(() => null);
    setLyricsBusy(false);
    if (!response?.ok) {
      setError("Somente a versão mais recente pode ser aprovada.");
      return;
    }
    setStatus("lyrics_approved");
    setMessage("Letra aprovada. Nenhuma música foi gerada por esta ação.");
    router.refresh();
  };

  const beginGeneration = async () => {
    setGenerationBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/generation`, {
      method: "POST",
    }).catch(() => null);
    setGenerationBusy(false);
    const data = response ? await response.json().catch(() => null) as { error?: string; mode?: "mock" | "live" } | null : null;
    if (!response?.ok) {
      setError(data?.error === "generation_limit_reached"
        ? "O limite temporário de criações foi atingido. Tente novamente mais tarde; nenhum crédito foi consumido."
        : "Não foi possível reservar a geração. Nenhum reenvio automático foi feito.");
      return;
    }
    setStatus("generating");
    setMessage(data?.mode === "live"
      ? "Geração enviada. Você pode acompanhar o estado em Meus pedidos."
      : "Geração simulada e persistida sem consumir créditos.");
    router.refresh();
  };

  const requestAdjustment = async () => {
    if (!sourceVersionId || adjustmentNotes.trim().length < 3) {
      setError("Escolha a versão de referência e descreva o ajuste desejado.");
      return;
    }
    setAdjustmentBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/adjustment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceVersionId, notes: adjustmentNotes }),
    }).catch(() => null);
    setAdjustmentBusy(false);
    const data = response ? await response.json().catch(() => null) as { error?: string; mode?: "mock" | "live"; status?: string } | null : null;
    if (!response?.ok) {
      setError(data?.error === "generation_limit_reached"
        ? "O limite temporário de criações foi atingido. Seu ajuste continua disponível; tente novamente mais tarde."
        : "Não foi possível reservar o ajuste. Nenhuma nova geração automática foi feita.");
      return;
    }
    setAdjustmentStatus(data?.status === "failed" ? "available" : "reserved");
    setMessage(data?.mode === "live"
      ? "Ajuste reservado e enviado. A versão original continua guardada."
      : "Ajuste reservado em modo simulado, sem consumir créditos. A versão original continua guardada.");
    router.refresh();
  };

  const prepareCheckout = async () => {
    if (!selectedVersionId) {
      setError("Escolha uma versão antes de preparar o pagamento.");
      return;
    }
    setPaymentBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: selectedVersionId, requestId: checkoutRequestId }),
    }).catch(() => null);
    setPaymentBusy(false);
    if (!response?.ok) {
      setCheckoutRequestId(crypto.randomUUID());
      setError("Não foi possível preparar o pagamento. A música completa continua bloqueada.");
      return;
    }
    const data = await response.json() as {
      paymentIntentId?: string;
      status?: string;
      mode?: "mock" | "live";
      provider?: string;
      pixCopyPaste?: string | null;
      pixQrCodeBase64?: string | null;
      checkoutUrl?: string | null;
      expiresAt?: string | null;
    };
    if (!data.paymentIntentId) {
      setError("O pagamento não retornou um identificador válido.");
      return;
    }
    setPaymentIntentId(data.paymentIntentId);
    setPaymentStatus(data.status ?? "pending");
    setPaymentMode(data.mode ?? "mock");
    setPaymentProvider(data.provider ?? (data.mode === "live" ? null : "mock"));
    setPixCopyPaste(data.pixCopyPaste ?? null);
    setPixQrCodeBase64(data.pixQrCodeBase64 ?? null);
    setPixCheckoutUrl(data.checkoutUrl ?? null);
    setPixExpiresAt(data.expiresAt ?? null);
    setStatus(data.status === "confirmed" ? "paid" : data.status === "failed" ? "preview_ready" : "payment_pending");
    setMessage(data.mode === "live"
      ? "Pix preparado com segurança. A música completa será liberada somente após a confirmação do provedor."
      : "Pagamento simulado preparado. Nenhum valor foi cobrado e o áudio completo continua bloqueado.");
    router.refresh();
  };

  const simulatePaymentEvent = async (incomingStatus: "confirmed" | "failed") => {
    if (!paymentIntentId) return;
    setPaymentBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/checkout/mock-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId,
        eventId: paymentEventId,
        status: incomingStatus,
      }),
    }).catch(() => null);
    setPaymentBusy(false);
    if (!response?.ok) {
      setError("O evento simulado não pôde ser confirmado pelo servidor.");
      return;
    }
    const data = await response.json() as { status?: string };
    setPaymentStatus(data.status ?? incomingStatus);
    if (data.status === "confirmed") {
      setStatus("paid");
      setMessage("Pagamento simulado confirmado pelo servidor. A versão escolhida foi mantida para entrega.");
    } else if (data.status === "failed") {
      setStatus("preview_ready");
      setMessage("Pagamento simulado falhou. O áudio completo permaneceu bloqueado e você pode tentar novamente.");
      setCheckoutRequestId(crypto.randomUUID());
      setPaymentEventId(crypto.randomUUID());
    }
    router.refresh();
  };

  const downloadFullAudio = async () => {
    setDeliveryBusy(true);
    setError("");
    const response = await fetch(`/api/orders/${order.id}/audio`).catch(() => null);
    setDeliveryBusy(false);
    if (!response?.ok) {
      setError("A música completa ainda não está disponível para download.");
      return;
    }
    const data = await response.json() as { url?: string };
    if (!data.url) {
      setError("O download não retornou um endereço válido.");
      return;
    }
    window.location.assign(data.url);
    setStatus("delivered");
  };

  const rotateShareLink = async () => {
    setDeliveryBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dedication }),
    }).catch(() => null);
    setDeliveryBusy(false);
    if (!response?.ok) {
      setError("Não foi possível criar o link do presente.");
      return;
    }
    const data = await response.json() as { shareUrl?: string };
    if (!data.shareUrl) {
      setError("O link do presente não foi retornado.");
      return;
    }
    setShareUrl(data.shareUrl);
    setShareActive(true);
    setStatus("delivered");
    setMessage("Novo link criado. Qualquer link anterior deixou de funcionar.");
    router.refresh();
  };

  const revokeShareLink = async () => {
    setDeliveryBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/orders/${order.id}/share`, {
      method: "DELETE",
    }).catch(() => null);
    setDeliveryBusy(false);
    if (!response?.ok) {
      setError("Não foi possível revogar o link do presente.");
      return;
    }
    setShareUrl(null);
    setShareActive(false);
    setMessage("Link revogado. Quem tinha o endereço anterior não consegue mais abrir o presente.");
    router.refresh();
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveBriefing} className="rounded-[26px] border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">História e direção</h2>
          <Badge variant="outline">{revisionCounts.source} {revisionCounts.source === 1 ? "revisão" : "revisões"}</Badge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">Para quem é a música?<select value={occasion} onChange={(event) => setOccasion(event.target.value)} disabled={!editable} className="h-12 w-full rounded-xl border bg-background px-3 font-normal">{recipientOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          {occasion === "Outro" && <label className="space-y-2 text-sm font-semibold">Relação com a pessoa<Input value={customOccasion} onChange={(event) => setCustomOccasion(event.target.value)} disabled={!editable} required maxLength={80} className="h-12 rounded-xl font-normal" /></label>}
          <label className="space-y-2 text-sm font-semibold">Estilo<select value={style} onChange={(event) => setStyle(event.target.value)} disabled={!editable} className="h-12 w-full rounded-xl border bg-background px-3 font-normal">{MUSIC_STYLE_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          {style === "Outro" && <label className="space-y-2 text-sm font-semibold">Ritmo desejado<Input value={customStyle} onChange={(event) => setCustomStyle(event.target.value)} disabled={!editable} required maxLength={120} className="h-12 rounded-xl font-normal" /></label>}
          <label className="space-y-2 text-sm font-semibold">Voz<select value={voicePreference} onChange={(event) => setVoicePreference(event.target.value as VoicePreference)} disabled={!editable} className="h-12 w-full rounded-xl border bg-background px-3 font-normal">{VOICE_OPTIONS.map((voice) => <option key={voice.value} value={voice.value}>{voice.label}</option>)}</select></label>
          <label className="space-y-2 text-sm font-semibold">Para quem<Input value={recipient} onChange={(event) => setRecipient(event.target.value)} disabled={!editable} className="h-12 rounded-xl" /></label>
          <label className="space-y-2 text-sm font-semibold">Pronúncia<Input value={pronunciation} onChange={(event) => setPronunciation(event.target.value)} disabled={!editable} className="h-12 rounded-xl" /></label>
        </div>
        <label className="mt-4 block space-y-2 text-sm font-semibold">História<Textarea value={story} onChange={(event) => setStory(event.target.value)} disabled={!editable} minLength={200} maxLength={4000} className="min-h-56 rounded-xl p-4 font-normal leading-6" /><span className="block text-right text-xs font-normal text-muted-foreground">{story.length}/4.000</span></label>
        <Button type="submit" className="mt-5 w-full rounded-full" disabled={!editable || briefingBusy}>{briefingBusy ? <><LoaderCircle className="animate-spin" /> Salvando</> : <><Save /> Salvar nova revisão</>}</Button>
      </form>

      <section className="rounded-[26px] border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Letra</h2>
          <Badge variant="outline">{revisionCounts.proposed} propostas · {revisionCounts.approved} aprovadas</Badge>
        </div>
        <Textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} disabled={!editable} minLength={100} maxLength={5000} className="mt-6 min-h-[430px] rounded-xl p-4 font-serif leading-7" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" className="rounded-full" disabled={!editable || lyricsBusy} onClick={() => void saveLyricsRevision()}>{lyricsBusy ? <LoaderCircle className="animate-spin" /> : <Save />} Salvar versão</Button>
          <Button type="button" className="rounded-full" disabled={!editable || lyricsBusy || status !== "lyrics_review"} onClick={() => void approveLyrics()}><CheckCircle2 /> Aprovar esta letra</Button>
        </div>
        {status === "lyrics_approved" && <Button type="button" className="mt-3 w-full rounded-full" disabled={generationBusy} onClick={() => void beginGeneration()}>{generationBusy ? <><LoaderCircle className="animate-spin" /> Reservando</> : <><Sparkles /> Iniciar criação musical</>}</Button>}
        <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />Revisões antes do primeiro áudio não consomem o ajuste incluído.</p>
      </section>

      {(message || error) && <div className={`rounded-2xl p-4 text-sm lg:col-span-2 ${error ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-900"}`} role={error ? "alert" : "status"}>{error || message}</div>}
      {!editable && <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground lg:col-span-2"><p>A história e a letra ficam somente para consulta depois que a geração musical começa.</p>{generationTask && <p className="mt-2 font-semibold text-foreground">{generationTask.status === "reconciling" ? "Estamos conferindo se o fornecedor recebeu o pedido; nenhum novo envio será feito agora." : generationTask.status === "failed" ? "A tentativa falhou e ficou registrada para uma retomada segura." : generationTask.status === "succeeded" && readyVersions.length > 0 ? "Sua prévia está pronta para ouvir abaixo." : generationTask.status === "succeeded" ? "O áudio chegou e está sendo preparado para a prévia." : "A criação musical está na fila ou em processamento."}</p>}</div>}

      {readyVersions.length > 0 && ["preview_ready", "payment_pending", "paid", "delivered"].includes(status) && (
        <section id="amostras" className="relative scroll-mt-24 overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#260b19] via-[#521631] to-[#7e2148] p-5 text-white shadow-[0_28px_90px_rgba(63,15,39,.24)] sm:p-9 lg:col-span-2">
          <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[42px] border-white/[.05]" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-rose-300/10 blur-3xl" />
          <div className="relative">
            <Badge className="rounded-full border border-white/15 bg-white/10 text-rose-100 hover:bg-white/10"><Play /> Sua amostra exclusiva chegou</Badge>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">Agora é só dar o play e sentir a história ganhar vida.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Escute cada versão com calma antes de escolher. Somente a prévia privada de até 50 segundos é carregada; a música completa continua protegida até a confirmação do pagamento.</p>
          </div>
          <div className="relative mt-7 grid gap-4 md:grid-cols-2">
            {readyVersions.map((version, index) => (
              <MusicPreviewPlayer
                key={version.id}
                orderId={order.id}
                versionId={version.id}
                label={`${version.origin === "original" ? "Versão original" : "Versão ajustada"} · prévia ${index + 1}`}
                title={version.title ?? `Música ${index + 1}`}
              />
            ))}
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-semibold text-white/65">
            <span className="rounded-full border border-white/12 bg-white/[.07] px-3 py-2">🔒 Áudio privado</span>
            <span className="rounded-full border border-white/12 bg-white/[.07] px-3 py-2">🎧 Prévia real de até 50 segundos</span>
            <span className="rounded-full border border-white/12 bg-white/[.07] px-3 py-2">✨ 1 ajuste incluído</span>
          </div>
        </section>
      )}

      {status === "preview_ready" && readyVersions.length > 0 && (
        <section className="rounded-[26px] border bg-card p-5 shadow-sm sm:p-7 lg:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10"><Music2 /> Prévia disponível</Badge><h2 className="mt-3 font-display text-2xl font-semibold">Seu ajuste incluído</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A nova criação preserva a letra aprovada, mas pode mudar voz, melodia e arranjo. A versão original continuará disponível para escolha.</p></div>
            <Badge variant="outline"><WandSparkles /> {adjustmentStatus === "available" ? "1 ajuste disponível" : adjustmentStatus === "completed" ? "Ajuste utilizado" : "Ajuste reservado"}</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">Versão de referência<select value={sourceVersionId} onChange={(event) => setSourceVersionId(event.target.value)} disabled={adjustmentStatus !== "available" || adjustmentBusy} className="h-12 w-full rounded-xl border bg-background px-3 font-normal">{readyVersions.map((version, index) => <option key={version.id} value={version.id}>{version.title ?? `Versão ${index + 1}`} · {version.origin === "original" ? "original" : "ajuste"}</option>)}</select></label>
            <label className="space-y-2 text-sm font-semibold sm:col-span-2">O que você deseja mudar?<Textarea value={adjustmentNotes} onChange={(event) => setAdjustmentNotes(event.target.value)} disabled={adjustmentStatus !== "available" || adjustmentBusy} minLength={3} maxLength={2000} placeholder="Ex.: interpretação mais suave e arranjo mais acústico." className="min-h-28 rounded-xl p-4 font-normal" /><span className="block text-right text-xs font-normal text-muted-foreground">{adjustmentNotes.length}/2.000</span></label>
          </div>
          {adjustmentRequest?.status === "technical_failure" && adjustmentStatus === "available" && <p className="mt-3 text-sm text-amber-800">A tentativa anterior teve falha técnica; seu direito ao ajuste foi devolvido.</p>}
          <Button type="button" className="mt-5 rounded-full" disabled={adjustmentStatus !== "available" || adjustmentBusy} onClick={() => void requestAdjustment()}>{adjustmentBusy ? <><LoaderCircle className="animate-spin" /> Reservando</> : <><WandSparkles /> Solicitar meu ajuste</>}</Button>
        </section>
      )}

      {readyVersions.length > 0 && ["preview_ready", "payment_pending", "paid", "delivered"].includes(status) && (
        <section className="rounded-[26px] border bg-card p-5 shadow-sm sm:p-7 lg:col-span-2">
          <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Pagamento seguro{paymentMode === "mock" ? " · simulação" : " · Pix"}</Badge>
          <h2 className="mt-3 font-display text-2xl font-semibold">Escolha a música do presente</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">O pagamento e a entrega ficam vinculados a esta versão. Confirmar o retorno do navegador, sozinho, nunca libera o MP3.</p>
          <label className="mt-5 block space-y-2 text-sm font-semibold">Versão escolhida<select value={selectedVersionId} onChange={(event) => { setSelectedVersionId(event.target.value); setCheckoutRequestId(crypto.randomUUID()); }} disabled={status !== "preview_ready" || adjustmentStatus === "reserved" || paymentBusy} className="h-12 w-full rounded-xl border bg-background px-3 font-normal">{readyVersions.map((version, index) => <option key={version.id} value={version.id}>{version.title ?? `Versão ${index + 1}`} · {version.origin === "original" ? "original" : "ajuste"}</option>)}</select></label>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Total: R$ 19,90</p><p className="mt-1 text-xs text-muted-foreground">O áudio completo só é liberado depois da confirmação recebida e consultada no servidor.</p></div>{status === "preview_ready" && <Button type="button" className="rounded-full" disabled={paymentBusy || adjustmentStatus === "reserved"} onClick={() => void prepareCheckout()}>{paymentBusy ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Preparar pagamento</Button>}</div>
          {status === "payment_pending" && paymentIntentId && paymentMode === "mock" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950">Pagamento pendente · simulação</p><p className="mt-1 text-sm text-amber-900">Use os controles abaixo apenas para testar notificações autenticadas do servidor.</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" variant="outline" className="rounded-full" disabled={paymentBusy} onClick={() => void simulatePaymentEvent("failed")}>Simular falha</Button><Button type="button" className="rounded-full" disabled={paymentBusy} onClick={() => void simulatePaymentEvent("confirmed")}>{paymentBusy && <LoaderCircle className="animate-spin" />} Simular confirmação do servidor</Button></div></div>}
          {status === "payment_pending" && paymentIntentId && paymentMode === "live" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950">Pix pendente{paymentProvider ? ` · ${paymentProvider === "efi" ? "Efí" : "Mercado Pago"}` : ""}</p><p className="mt-1 text-sm text-amber-900">Pague pelo QR Code ou copia e cola. Esta tela não libera a música; aguardamos a confirmação consultada no provedor.</p>{pixQrCodeBase64 && <Image src={`data:image/png;base64,${pixQrCodeBase64}`} alt="QR Code Pix" width={220} height={220} unoptimized className="mt-4 rounded-xl bg-white p-2" />}{pixCopyPaste && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input readOnly value={pixCopyPaste} className="min-w-0 flex-1 bg-white" aria-label="Código Pix copia e cola" /><Button type="button" variant="outline" className="rounded-full" onClick={() => void navigator.clipboard.writeText(pixCopyPaste)}><Copy /> Copiar Pix</Button></div>}{pixExpiresAt && <p className="mt-3 text-xs text-amber-800">Válido até {new Date(pixExpiresAt).toLocaleString("pt-BR")}.</p>}<div className="mt-4 flex flex-wrap gap-3">{pixCheckoutUrl && <Button asChild variant="outline" className="rounded-full"><a href={pixCheckoutUrl} target="_blank" rel="noreferrer">Abrir pagamento</a></Button>}<Button type="button" variant="outline" className="rounded-full" disabled={paymentBusy} onClick={() => void prepareCheckout()}>{paymentBusy && <LoaderCircle className="animate-spin" />} Atualizar Pix</Button></div></div>}
          {status === "payment_pending" && paymentIntentId && paymentMode === null && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950">Pagamento pendente</p><Button type="button" variant="outline" className="mt-3 rounded-full" disabled={paymentBusy} onClick={() => void prepareCheckout()}>{paymentBusy && <LoaderCircle className="animate-spin" />} Carregar pagamento</Button></div>}
          {(status === "paid" || status === "delivered" || paymentStatus === "confirmed") && <div className="mt-4 rounded-2xl bg-emerald-100 p-4 text-sm font-semibold text-emerald-900"><CheckCircle2 className="mr-2 inline size-4" />Pagamento confirmado pelo servidor; versão bloqueada para a entrega.</div>}
        </section>
      )}

      {delivery && ["paid", "delivered"].includes(status) && (
        <section className="rounded-[26px] bg-[#351426] p-5 text-white shadow-sm sm:p-7 lg:col-span-2">
          <Badge className="rounded-full bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/15"><Gift /> Presente liberado</Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold">Baixe ou compartilhe a música escolhida</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">A página compartilhada mostra apenas a dedicatória, o nome de quem recebe e a música. História, briefing e letra continuam privados.</p>
          <div className="mt-6 grid gap-5 rounded-2xl bg-white/[.07] p-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="space-y-2 text-sm font-semibold">Dedicatória<Textarea value={dedication} onChange={(event) => setDedication(event.target.value)} minLength={1} maxLength={500} disabled={deliveryBusy} className="min-h-24 border-white/15 bg-white text-foreground" /><span className="block text-right text-xs font-normal text-white/50">{dedication.length}/500</span></label>
            <Button type="button" variant="secondary" className="rounded-full" disabled={deliveryBusy || !dedication.trim()} onClick={() => void rotateShareLink()}>{deliveryBusy ? <LoaderCircle className="animate-spin" /> : <Share2 />} {shareActive ? "Gerar novo link" : "Criar link privado"}</Button>
          </div>
          {shareUrl && <div className="mt-4 rounded-2xl bg-white p-4 text-foreground"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Copie agora — o token não fica visível depois</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input readOnly value={shareUrl} className="min-w-0 flex-1" /><Button type="button" variant="outline" className="rounded-full" onClick={() => void navigator.clipboard.writeText(shareUrl)}><Copy /> Copiar</Button></div></div>}
          {shareActive && !shareUrl && <p className="mt-4 text-sm text-white/70">Há um link ativo. Por segurança, gere um novo para copiá-lo; o endereço anterior será invalidado.</p>}
          <div className="mt-5 flex flex-wrap gap-3"><Button type="button" className="rounded-full bg-white text-primary hover:bg-white/90" disabled={deliveryBusy} onClick={() => void downloadFullAudio()}><Download /> Baixar MP3</Button>{shareActive && <Button type="button" variant="outline" className="rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" disabled={deliveryBusy} onClick={() => void revokeShareLink()}><Ban /> Revogar link</Button>}</div>
        </section>
      )}
    </div>
  );
}
