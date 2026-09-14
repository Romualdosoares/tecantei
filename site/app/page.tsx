"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Gift,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Music2,
  RotateCcw,
  Share2,
  Sparkles,
  WandSparkles,
  Star,
  Users,
  Award,
  Volume2,
  ShieldCheck,
  HeartHandshake,
  Baby,
  PenTool,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AudioShowcase } from "@/components/landing/audio-showcase";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TestimonialsPricingFaq } from "@/components/landing/testimonials-pricing-faq";
import { LandingFooter } from "@/components/landing/footer";
import { LiveAlbumPreview } from "@/components/studio/live-album-preview";
import { GenerationProgressStage } from "@/components/studio/generation-progress-stage";
import { GenerationReadyStage } from "@/components/studio/generation-ready-stage";
import { MUSIC_STYLE_OPTIONS, VOICE_OPTIONS, type VoicePreference } from "@/lib/order-options";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { BrandLogo } from "@/components/brand-logo";

const steps = ["Para quem", "História", "Memórias", "Estilo", "Mensagem", "Letra", "Prévia", "Entrega"];

const occasionsConfig = [
  { label: "Esposo(a)", icon: Heart },
  { label: "Namorado(a)", icon: HeartHandshake },
  { label: "Reconciliação", icon: RotateCcw },
  { label: "Noivo(a)", icon: Gift },
  { label: "Crush/Paixão", icon: Sparkles },
  { label: "Amigo(a)", icon: Users },
  { label: "Mãe", icon: Heart },
  { label: "Pai", icon: Award },
  { label: "Filho(a)", icon: Baby },
  { label: "Irmão(ã)", icon: Users },
  { label: "Eu mesmo", icon: Star },
  { label: "Outro", icon: PenTool },
];

const styles = MUSIC_STYLE_OPTIONS;

const waveform = [28, 44, 66, 36, 76, 54, 84, 46, 68, 92, 58, 38, 72, 50, 86, 62, 44, 78, 94, 52, 34, 68, 80, 46, 70, 90, 56, 42, 74, 60, 82, 48, 64, 88, 54, 36];

const inspirationPrompts = [
  "Como nos conhecemos pela primeira vez: ",
  "Um apelido carinhoso que só nós usamos: ",
  "Uma viagem ou lugar inesquecível juntos: ",
  "O que mais admiro e amo nessa pessoa: ",
  "Uma dificuldade que superamos juntos: ",
  "Uma mania, frase ou piada interna marcante: ",
  "Um sonho que queremos realizar no futuro: ",
  "A mensagem principal que quero deixar no refrão: ",
];

const landingTestimonials = [
  {
    quote: "Quando a música falou o apelido que só nós usamos, meu marido começou a chorar. Foi inesquecível.",
    name: "Mariana & Thiago",
    context: "Presente de bodas",
  },
  {
    quote: "Minha mãe se emocionou com as lembranças da nossa família. Hoje ela ouve a música quase todos os dias.",
    name: "Rodrigo Mendonça",
    context: "Aniversário da mãe",
  },
  {
    quote: "Poder editar a letra antes fez toda a diferença. Coloquei nossa gíria e a música ficou com a nossa cara.",
    name: "Beatriz Silveira",
    context: "Presente romântico",
  },
];

type ModelContext = {
  registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

type LyricDraftInput = {
  occasion: string;
  recipient: string;
  pronunciation: string;
  story: string;
  style: string;
  voicePreference: VoicePreference;
};

async function requestLyricDraft(input: LyricDraftInput) {
  const response = await fetch("/api/lyrics/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => null)) as { lyrics?: string; mode?: string; simulated?: boolean } | null;
  if (!response.ok || !data?.lyrics || typeof data.simulated !== "boolean") {
    throw new Error("lyrics_unavailable");
  }
  return data;
}

type GenerationStatusResponse = {
  status: string | null;
  orderStatus?: string;
  readyVersionCount: number;
  previewReady: boolean;
};

function demoProgressIncrement(progress: number) {
  if (progress < 18) return 3;
  if (progress < 58) return 2;
  if (progress < 88) return 1.5;
  return 1;
}

function generationProgressCap(status: string | null) {
  switch (status) {
    case "created": return 12;
    case "submitting": return 24;
    case "submitted": return 38;
    case "processing": return 82;
    case "reconciling": return 90;
    case "succeeded": return 98;
    default: return 8;
  }
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [occasion, setOccasion] = useState("");
  const [customOccasion, setCustomOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [voicePreference, setVoicePreference] = useState<VoicePreference>("feminina");
  const [name, setName] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [story, setStory] = useState("");
  const [favoriteMemories, setFavoriteMemories] = useState("");
  const [heartMessage, setHeartMessage] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [lyricsMode, setLyricsMode] = useState<"mock" | "live" | null>(null);
  const [lyricsBusy, setLyricsBusy] = useState(false);
  const [lyricsError, setLyricsError] = useState("");
  const [generation, setGeneration] = useState<"loading" | "error" | "ready">("loading");
  const [generationMode, setGenerationMode] = useState<"demo" | "mock" | "live">("demo");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationTaskStatus, setGenerationTaskStatus] = useState<string | null>(null);
  const [generationPollingWarning, setGenerationPollingWarning] = useState(false);
  const [selected, setSelected] = useState("original");
  const [paid, setPaid] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountMode, setAccountMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [accountBusy, setAccountBusy] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [draftRequestId] = useState(() => crypto.randomUUID());
  const [persistedOrderId, setPersistedOrderId] = useState<string | null>(null);
  const [deliveryNotice, setDeliveryNotice] = useState("");
  const supabaseEnabled = getSupabaseBrowserClient() !== null;

  const effectiveOccasion = occasion === "Outro" ? (customOccasion.trim() || "Outro") : occasion;
  const effectiveStyle = style === "Outro" ? customStyle.trim() : style;
  const completeStory = [
    story.trim(),
    favoriteMemories.trim() ? `Memórias favoritas: ${favoriteMemories.trim()}` : "",
    heartMessage.trim() ? `Mensagem do coração: ${heartMessage.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user?.email) return;
      setAccountEmail(data.user.email);
      setSignedIn(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      if (session?.user.email) setAccountEmail(session.user.email);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: "start_song_order",
        title: "Preparar pedido de música",
        description: "Preenche a história de um novo pedido e abre a revisão da letra no protótipo Te Cantei.",
        inputSchema: {
          type: "object",
          properties: {
            recipient: { type: "string", minLength: 1 },
            occasion: { type: "string", minLength: 1, maxLength: 80 },
            style: { type: "string", enum: styles },
            customStyle: { type: "string", minLength: 1, maxLength: 120 },
            voicePreference: { type: "string", enum: VOICE_OPTIONS.map((voice) => voice.value) },
            story: { type: "string", minLength: 200, maxLength: 4000 },
          },
          required: ["recipient", "occasion", "style", "voicePreference", "story"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input: unknown) {
          const value = input as Record<string, unknown>;
          if (
            typeof value.recipient !== "string" ||
            typeof value.story !== "string" ||
            typeof value.occasion !== "string" ||
            !styles.includes(String(value.style) as (typeof styles)[number]) ||
            !VOICE_OPTIONS.some((voice) => voice.value === value.voicePreference) ||
            (value.style === "Outro" && (typeof value.customStyle !== "string" || !value.customStyle.trim()))
          ) {
            throw new Error("Dados do pedido inválidos.");
          }
          const passedOccasion = String(value.occasion);
          const passedStyle = value.style === "Outro" ? String(value.customStyle).trim() : String(value.style);
          const passedVoice = value.voicePreference as VoicePreference;
          const isPredefined = occasionsConfig.some((o) => o.label === passedOccasion);
          setLyricsBusy(true);
          setLyricsError("");
          try {
            const draft = await requestLyricDraft({
              recipient: value.recipient,
              occasion: passedOccasion,
              pronunciation: "",
              story: value.story,
              style: passedStyle,
              voicePreference: passedVoice,
            });
            setName(value.recipient);
            if (isPredefined) {
              setOccasion(passedOccasion);
              setCustomOccasion("");
            } else {
              setOccasion("Outro");
              setCustomOccasion(passedOccasion);
            }
            setStyle(String(value.style));
            setCustomStyle(value.style === "Outro" ? passedStyle : "");
            setVoicePreference(passedVoice);
            setStory(value.story);
            setLyrics(draft.lyrics ?? "");
            setLyricsMode(draft.simulated ? "mock" : "live");
            setStep(6);
            return { status: "draft_ready", visibleStep: "Letra", simulated: true };
          } catch (error) {
            setLyricsError("Não foi possível preparar o rascunho agora.");
            throw error;
          } finally {
            setLyricsBusy(false);
          }
        },
      },
      { signal: lifecycle.signal }
    );
    void Promise.resolve(registration).catch(() => lifecycle.abort());
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    if (step !== 7 || generation !== "loading") return;

    let active = true;
    let finishTimer: number | undefined;
    let progressTimer: number | undefined;
    let pollTimer: number | undefined;
    let visualProgress = 0;

    const finish = () => {
      if (!active || finishTimer !== undefined) return;
      visualProgress = 100;
      setGenerationProgress(100);
      setGenerationTaskStatus("preview_ready");
      finishTimer = window.setTimeout(() => {
        if (active) setGeneration("ready");
      }, 900);
    };

    if (generationMode !== "live" || !persistedOrderId) {
      progressTimer = window.setInterval(() => {
        visualProgress = Math.min(100, visualProgress + demoProgressIncrement(visualProgress));
        setGenerationProgress(Math.round(visualProgress));
        if (visualProgress >= 100) {
          if (progressTimer !== undefined) window.clearInterval(progressTimer);
          finish();
        }
      }, 420);
    } else {
      let progressCap = 8;
      progressTimer = window.setInterval(() => {
        if (visualProgress >= progressCap) return;
        visualProgress = Math.min(progressCap, visualProgress + (visualProgress < 30 ? 2 : 1));
        setGenerationProgress(Math.round(visualProgress));
      }, 650);

      const poll = async () => {
        const response = await fetch(`/api/orders/${persistedOrderId}/generation`, {
          cache: "no-store",
          credentials: "same-origin",
        }).catch(() => null);
        const data = response
          ? await response.json().catch(() => null) as GenerationStatusResponse | null
          : null;
        if (!active) return;
        if (!response?.ok || !data) {
          setGenerationPollingWarning(true);
          return;
        }

        setGenerationPollingWarning(false);
        setGenerationTaskStatus(data.status);
        progressCap = generationProgressCap(data.status);

        if (data.status === "failed") {
          setGeneration("error");
          return;
        }
        if (data.previewReady && data.readyVersionCount > 0) finish();
      };

      void poll();
      pollTimer = window.setInterval(() => void poll(), 4_000);
    }

    return () => {
      active = false;
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
      if (progressTimer !== undefined) window.clearInterval(progressTimer);
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
    };
  }, [generation, generationMode, persistedOrderId, step]);

  const goTo = (next: number) => {
    const destination = Math.max(0, Math.min(9, next));
    if (step === 0 && destination === 1) trackAnalyticsEvent("cta_create_music");
    if (destination >= 1 && destination <= 8) trackAnalyticsEvent("funnel_step", { step: destination });
    if (destination === 9) trackAnalyticsEvent("checkout_open");
    if (destination === 8 && step === 9) trackAnalyticsEvent("purchase_confirmed");
    setStep(destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const addInspirationPrompt = (promptText: string) => {
    if (!story.includes(promptText)) {
      setStory((prev) => (prev ? `${prev}\n\n${promptText}` : promptText));
    }
  };

  const createLyricDraft = async () => {
    if (!occasion) {
      setLyricsError("Escolha para quem é a música.");
      return;
    }
    if (occasion === "Outro" && !customOccasion.trim()) {
      setLyricsError("Por favor, diga para quem é a música.");
      return;
    }
    if (!name.trim()) {
      setLyricsError("Informe para quem é a música.");
      return;
    }
    if (!effectiveStyle) {
      setLyricsError("Escreva qual ritmo você deseja.");
      return;
    }
    if (story.trim().length < 200) {
      setLyricsError("Conte um pouco mais da história: use pelo menos 200 caracteres para ficar emocionante.");
      return;
    }

    setLyricsBusy(true);
    setLyricsError("");
    try {
      const draft = await requestLyricDraft({
        occasion: effectiveOccasion,
        recipient: name,
        pronunciation,
        story: completeStory,
        style: effectiveStyle,
        voicePreference,
      });
      setLyrics(draft.lyrics ?? "");
      setLyricsMode(draft.simulated ? "mock" : "live");
      goTo(6);
    } catch {
      setLyricsError("Não foi possível preparar o rascunho agora. Tente novamente.");
    } finally {
      setLyricsBusy(false);
    }
  };

  const persistApprovedDraft = async () => {
    if (!supabaseEnabled) return "demo";
    if (persistedOrderId) return persistedOrderId;

    setOrderBusy(true);
    setOrderError("");
    const response = await fetch("/api/orders/approve-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: draftRequestId,
        occasion: effectiveOccasion,
        recipient: name,
        pronunciation,
        story: completeStory,
        style: effectiveStyle,
        voicePreference,
        lyrics,
      }),
    }).catch(() => null);
    setOrderBusy(false);

    if (!response?.ok) {
      setOrderError("Não foi possível salvar e aprovar o pedido. Tente novamente.");
      return null;
    }
    const data = (await response.json()) as { order_id?: string };
    if (!data.order_id) {
      setOrderError("O pedido não retornou um identificador válido.");
      return null;
    }
    setPersistedOrderId(data.order_id);
    return data.order_id;
  };

  const beginGeneration = async (orderId: string) => {
    if (orderId === "demo") {
      setGenerationMode("demo");
      return true;
    }

    setOrderBusy(true);
    setOrderError("");
    const response = await fetch(`/api/orders/${orderId}/generation`, {
      method: "POST",
    }).catch(() => null);
    setOrderBusy(false);
    const data = response ? ((await response.json().catch(() => null)) as { error?: string; mode?: "mock" | "live" } | null) : null;
    if (!response?.ok) {
      setOrderError(
        data?.error === "generation_limit_reached"
          ? "O limite temporário de criações foi atingido. Tente novamente mais tarde; nenhum crédito foi consumido."
          : data?.error === "generation_not_open"
            ? "A geração real da amostra ainda não está disponível. Tente novamente em alguns minutos; nenhum crédito foi consumido."
            : data?.error === "generation_security_not_configured"
              ? "A geração está temporariamente indisponível por uma verificação de segurança. Nenhum crédito foi consumido."
          : "Não foi possível reservar a geração. Nenhum reenvio automático foi feito."
      );
      return false;
    }
    if (data?.mode !== "live") {
      setOrderError("A prévia real não foi iniciada. Nenhum áudio de demonstração será exibido no lugar da sua música.");
      return false;
    }
    setGenerationMode("live");
    return true;
  };

  const startGeneration = async () => {
    if (!signedIn) {
      setAccountError("");
      setAccountOpen(true);
      return;
    }
    const orderId = await persistApprovedDraft();
    if (!orderId || !(await beginGeneration(orderId))) return;
    setGenerationProgress(0);
    setGenerationTaskStatus(null);
    setGenerationPollingWarning(false);
    setGeneration("loading");
    goTo(7);
  };

  const continueWithAccount = async () => {
    if (!accountEmail.includes("@") || accountPassword.length < 6) {
      setAccountError("Informe um e-mail válido e uma senha com pelo menos 6 caracteres.");
      return;
    }

    setAccountBusy(true);
    setAccountError("");
    setAccountMessage("");
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setSignedIn(true);
      setAccountOpen(false);
      setGeneration("loading");
      setAccountBusy(false);
      goTo(7);
      return;
    }

    const result =
      accountMode === "sign_up"
        ? await supabase.auth.signUp({
            email: accountEmail,
            password: accountPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: accountEmail,
            password: accountPassword,
          });

    setAccountBusy(false);
    if (result.error) {
      setAccountError(
        accountMode === "sign_up"
          ? "Não foi possível criar a conta. Confira o e-mail e tente novamente."
          : "E-mail ou senha não conferem."
      );
      return;
    }
    if (!result.data.session) {
      setAccountMessage("Enviamos um link de confirmação para o seu e-mail.");
      return;
    }

    setSignedIn(true);
    setAccountOpen(false);
    const orderId = await persistApprovedDraft();
    if (!orderId || !(await beginGeneration(orderId))) return;
    setGenerationProgress(0);
    setGenerationTaskStatus(null);
    setGenerationPollingWarning(false);
    setGeneration("loading");
    goTo(7);
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setSignedIn(false);
    setAccountPassword("");
  };

  const openOrderDelivery = () => {
    if (!persistedOrderId) {
      setDeliveryNotice("Esta é uma demonstração da entrega. Na compra real, o download e o link privado ficam disponíveis em Meus pedidos.");
      return;
    }
    window.location.assign(`/pedidos/${persistedOrderId}`);
  };

  const sendPasswordReset = async () => {
    if (!accountEmail.includes("@")) {
      setAccountError("Informe seu e-mail antes de recuperar a senha.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAccountError("A recuperação estará disponível quando o Supabase for configurado.");
      return;
    }

    setAccountBusy(true);
    setAccountError("");
    setAccountMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
    });
    setAccountBusy(false);
    if (error) {
      setAccountError("Não foi possível enviar a recuperação agora.");
      return;
    }
    setAccountMessage("Se a conta existir, enviaremos um link para criar uma nova senha.");
  };

  const continueBriefing = () => {
    setLyricsError("");
    if (step === 1) {
      if (!occasion) {
        setLyricsError("Escolha para quem é a música.");
        return;
      }
      if (occasion === "Outro" && !customOccasion.trim()) {
        setLyricsError("Diga para quem é a música.");
        return;
      }
      if (!name.trim()) {
        setLyricsError("Informe o nome da pessoa homenageada.");
        return;
      }
    }
    if (step === 2 && story.trim().length < 200) {
      setLyricsError("Conte um pouco mais: use pelo menos 200 caracteres para criar uma letra pessoal.");
      return;
    }
    if (step === 4 && !effectiveStyle) {
      setLyricsError("Escolha um estilo ou escreva o ritmo que deseja.");
      return;
    }
    if (step === 5) {
      void createLyricDraft();
      return;
    }
    goTo(step + 1);
  };

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-rose-500/20">
      {/* Top Floating Glass Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-rose-200/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <button onClick={() => goTo(0)} className="flex shrink-0 items-center gap-2.5 text-left group" aria-label="Voltar ao início">
            <BrandLogo compact priority className="transition duration-500 group-hover:scale-105 group-hover:border-[#F5D77E]/70" />
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-[#2b1722] group-hover:text-rose-900 transition">
                Te Cantei
              </span>
              <span className="block text-[0.65rem] font-semibold tracking-wider text-rose-800 uppercase">
                Sua história virou música
              </span>
            </div>
          </button>

          {/* Desktop links for Landing Navigation */}
          {step === 0 && (
            <p className="hidden lg:block text-sm font-semibold text-muted-foreground">
              Ouça 50 segundos antes de decidir · Pagamento único
            </p>
          )}

          {/* Account / Action CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {signedIn ? (
              <div className="flex items-center gap-1.5">
                <Button asChild variant="ghost" className="rounded-full text-xs sm:text-sm font-semibold">
                  <Link href="/pedidos">Meus pedidos</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full px-3 text-xs text-muted-foreground hover:text-rose-900"
                  onClick={() => void signOut()}
                  title={`Sair de ${accountEmail}`}
                >
                  Sair
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="rounded-full px-3 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-rose-900"
                onClick={() => setAccountOpen(true)}
              >
                Entrar
              </Button>
            )}

            {step === 0 ? (
              <Button
                onClick={() => goTo(1)}
                className="rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-rose-900/20 hover:scale-105 active:scale-95 transition"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                Criar minha música
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => goTo(0)}
                className="rounded-full text-xs font-medium border-rose-200"
              >
                ← Início
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* LANDING ENXUTA DE CONVERSÃO */}
      {step === 0 && (
        <div>
          <section className="relative overflow-hidden px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
            <div className="pointer-events-none absolute left-1/3 top-0 size-[34rem] rounded-full bg-rose-200/35 blur-3xl" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <Badge className="rounded-full border-0 bg-rose-100 px-4 py-1.5 text-sm font-bold text-rose-950 hover:bg-rose-100">
                  Um presente único, criado com a história de vocês
                </Badge>
                <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[#2b1722] sm:text-6xl">
                  Transforme o que vocês viveram em uma canção para guardar para sempre.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Nomes, lugares, apelidos, conquistas e lembranças que só vocês entendem viram uma música exclusiva para emocionar quem você ama — hoje e toda vez que ela tocar.
                </p>

                <div className="mt-6 max-w-2xl rounded-2xl border-l-4 border-rose-600 bg-white/80 px-5 py-4 shadow-sm">
                  <p className="font-display text-xl font-bold text-[#2b1722]">Não é apenas uma música.</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">É uma forma de dizer tudo aquilo que, às vezes, o coração sente e as palavras não conseguem explicar.</p>
                </div>

                <Button
                  size="lg"
                  onClick={() => goTo(1)}
                  className="mt-8 h-14 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-8 text-base font-extrabold text-white shadow-xl shadow-rose-900/25 transition hover:scale-[1.03] active:scale-95"
                >
                  <Heart className="mr-2 size-5 fill-current" /> Criar uma música para quem eu amo <ArrowRight className="ml-2 size-5" />
                </Button>

                <p className="mt-3 text-sm font-bold text-rose-900">Comece agora e ouça 50 segundos antes de decidir pela compra.</p>

                <ul className="mt-7 grid gap-3 text-sm font-semibold text-[#422030] sm:grid-cols-3">
                  {["Você aprova cada verso", "1 ajuste incluído", "R$ 19,90 sem assinatura"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700"><Check className="size-3" /></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mx-auto w-full max-w-md">
                <LiveAlbumPreview recipient={name || "Alguém especial"} occasion={effectiveOccasion || "Uma homenagem única"} style={effectiveStyle || "Seu estilo"} />
                <div className="mx-auto -mt-3 w-[88%] rounded-2xl border border-rose-200 bg-white/95 px-5 py-4 text-center shadow-lg">
                  <p className="text-sm font-extrabold text-[#2b1722]">Ouça antes de decidir</p>
                  <p className="mt-1 text-xs text-muted-foreground">Prévia de 50 segundos · música completa após o pagamento</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-rose-100 bg-white/65 px-4 py-9 sm:px-8">
            <div className="mx-auto max-w-6xl">
              <p className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-rose-800">Do sentimento ao presente</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {[
                  ["1", "Conte a história"],
                  ["2", "Revise a letra"],
                  ["3", "Ouça 50 segundos"],
                  ["4", "Receba e compartilhe"],
                ].map(([number, label]) => (
                  <div key={number} className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-4 shadow-sm">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2b1722] text-sm font-extrabold text-white">{number}</span>
                    <span className="text-sm font-bold text-[#2b1722]">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7 text-center">
                <Button variant="outline" onClick={() => goTo(1)} className="h-12 rounded-full border-rose-300 bg-white px-7 font-bold text-rose-950 hover:bg-rose-50">
                  Começar agora <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </section>

          <section className="px-4 py-14 sm:px-8 sm:py-18">
            <div className="mx-auto max-w-6xl">
              <div className="mx-auto max-w-3xl text-center">
                <div className="flex justify-center gap-1 text-amber-400" aria-label="Avaliações com cinco estrelas">
                  {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-5 fill-current" />)}
                </div>
                <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.16em] text-rose-800">Histórias que viraram emoção</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold text-[#2b1722] sm:text-5xl">Um presente que a pessoa amada pode ouvir de novo — e sentir tudo outra vez.</h2>
              </div>

              <div className="mt-9 grid gap-5 md:grid-cols-3">
                {landingTestimonials.map((testimonial) => (
                  <figure key={testimonial.name} className="flex h-full flex-col justify-between rounded-[26px] border border-rose-200/80 bg-white p-6 shadow-sm">
                    <div>
                      <div className="flex gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-4 fill-current" />)}
                      </div>
                      <blockquote className="mt-5 text-base font-medium leading-relaxed text-[#3a1a29]">“{testimonial.quote}”</blockquote>
                    </div>
                    <figcaption className="mt-6 border-t border-rose-100 pt-4">
                      <p className="text-sm font-extrabold text-[#2b1722]">{testimonial.name}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">{testimonial.context}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 pb-16 sm:px-8 sm:pb-20">
            <div className="tc-premium-frame relative mx-auto grid max-w-6xl overflow-hidden rounded-[34px] bg-gradient-to-br from-[#351426] via-[#571a3b] to-[#250a18] p-7 text-white shadow-2xl sm:p-11 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-10">
              <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-rose-400/20 blur-3xl" />
              <div className="relative">
                <Badge className="border-0 bg-white/10 text-rose-100 hover:bg-white/10">Uma lembrança que não expira</Badge>
                <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-5xl">O momento passa. A canção fica.</h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                  As melhores histórias vivem nos pequenos detalhes: uma frase, um lugar, um apelido, um dia que mudou tudo. Registre essas lembranças enquanto ainda estão vivas e transforme-as em algo que poderá atravessar anos.
                </p>
                <p className="mt-4 font-display text-xl font-bold text-rose-100">Imagine a reação de quem você ama ao perceber que aquela música conta exatamente a história de vocês.</p>
              </div>
              <div className="relative mt-8 rounded-[26px] border border-white/15 bg-white/10 p-6 text-center backdrop-blur-sm lg:mt-0">
                <p className="text-sm font-bold text-rose-100">Música completa + página para presentear</p>
                <p className="mt-2 font-display text-4xl font-extrabold">R$ 19,90</p>
                <p className="mt-1 text-xs text-white/60">Pagamento único · sem mensalidade</p>
                <Button size="lg" onClick={() => goTo(1)} className="mt-6 h-14 w-full rounded-full bg-white px-6 text-base font-extrabold text-[#3b1228] shadow-xl transition hover:scale-[1.02] hover:bg-rose-50">
                  Criar minha música agora <ArrowRight className="ml-2 size-5" />
                </Button>
                <p className="mt-3 text-xs font-semibold text-white/65">Você ouve a prévia antes de comprar.</p>
              </div>
            </div>
          </section>

          <LandingFooter />
        </div>
      )}

      {/* ETAPAS 1 A 5: BRIEFING GUIADO */}
      {step >= 1 && step <= 5 && (
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
          <div className="mb-7">
            <div className="mb-3 flex items-center justify-between text-sm font-bold">
              <span className="text-rose-900">Etapa {step} de 8</span>
              <span className="text-muted-foreground">{steps[step - 1]}</span>
            </div>
            <Progress value={(step / 8) * 100} className="h-2.5 bg-rose-100" />
          </div>

          <div className="tc-premium-frame rounded-[30px] border border-rose-200/80 bg-white p-5 shadow-xl shadow-rose-900/5 sm:p-9">
            {step === 1 && (
              <div>
                <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100">Etapa 1</Badge>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-[#2b1722] sm:text-4xl">Para quem é a música?</h1>
                <p className="mt-2 text-base text-muted-foreground">Escolha uma opção</p>
                <RadioGroup value={occasion} onValueChange={setOccasion} className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {occasionsConfig.map((item) => {
                    const Icon = item.icon;
                    const isSelected = occasion === item.label;
                    return (
                      <label key={item.label} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-bold transition ${isSelected ? "border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-500/15" : "border-rose-150 bg-white hover:border-rose-300 hover:bg-rose-50/50"}`}>
                        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${isSelected ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700"}`}><Icon className="size-4" /></span>
                        <RadioGroupItem value={item.label} className="sr-only" />
                        {item.label}
                      </label>
                    );
                  })}
                </RadioGroup>
                {occasion === "Outro" && (
                  <label className="mt-5 block space-y-2 text-sm font-bold text-[#2b1722]">
                    <span>Para quem é a música? *</span>
                    <Input value={customOccasion} onChange={(event) => setCustomOccasion(event.target.value)} maxLength={80} placeholder="Ex.: avó, professor(a), colega de trabalho..." className="h-12 rounded-xl border-rose-300 text-base" />
                  </label>
                )}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-bold text-[#2b1722]">
                    <span>Nome da pessoa homenageada *</span>
                    <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex.: Marina" className="h-12 rounded-xl border-rose-200 text-base" />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-[#2b1722]">
                    <span>Apelido carinhoso <small className="font-normal text-muted-foreground">(Opcional)</small></span>
                    <Input value={pronunciation} onChange={(event) => setPronunciation(event.target.value)} maxLength={200} placeholder="Ex.: Mari, Amor..." className="h-12 rounded-xl border-rose-200 text-base" />
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100">Etapa 2</Badge>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-[#2b1722] sm:text-4xl">Conte a história e os momentos especiais *</h1>
                <p className="mt-2 text-base text-muted-foreground">Escreva do seu jeito. Quanto mais pessoal, mais única fica a letra.</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {inspirationPrompts.map((promptText) => (
                    <button key={promptText} type="button" onClick={() => addInspirationPrompt(promptText)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-100">+ {promptText.split(":")[0]}</button>
                  ))}
                </div>
                <Textarea value={story} onChange={(event) => setStory(event.target.value)} minLength={200} maxLength={2300} rows={9} placeholder="Conte como tudo começou, o que vocês viveram e por que essa pessoa é especial..." className="mt-5 resize-y rounded-2xl border-rose-200 p-4 text-base leading-relaxed" />
                <p className="mt-2 text-right text-xs font-medium text-muted-foreground">{story.length}/2.300 caracteres · mínimo 200</p>
              </div>
            )}

            {step === 3 && (
              <div>
                <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100">Etapa 3</Badge>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-[#2b1722] sm:text-4xl">Compartilhe suas memórias favoritas</h1>
                <p className="mt-2 text-base font-semibold text-rose-900">Opcional</p>
                <p className="mt-3 text-base text-muted-foreground">Momentos especiais juntos. Que momentos com essa pessoa você mais valoriza?</p>
                <Textarea value={favoriteMemories} onChange={(event) => setFavoriteMemories(event.target.value)} maxLength={800} rows={8} placeholder="Ex.: nossa primeira viagem, um domingo em família, uma conquista que celebramos juntos..." className="mt-6 resize-y rounded-2xl border-rose-200 p-4 text-base leading-relaxed" />
                <p className="mt-2 text-right text-xs font-medium text-muted-foreground">{favoriteMemories.length}/800 caracteres</p>
              </div>
            )}

            {step === 4 && (
              <div>
                <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100">Etapa 4</Badge>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-[#2b1722] sm:text-4xl">Escolha um estilo musical</h1>
                <p className="mt-2 text-lg font-bold text-[#2b1722]">Qual estilo combina mais? *</p>
                <p className="mt-1 text-base text-muted-foreground">Selecione o estilo musical para sua canção.</p>
                <RadioGroup value={style} onValueChange={setStyle} className="mt-7 flex flex-wrap gap-2.5">
                  {styles.map((item) => {
                    const isSelected = style === item;
                    return (
                      <label key={item} className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm font-bold transition ${isSelected ? "border-rose-700 bg-gradient-to-r from-[#8b2450] to-[#b94970] text-white shadow-md" : "border-rose-200 bg-white text-[#2b1722] hover:border-rose-400 hover:bg-rose-50"}`}>
                        <RadioGroupItem value={item} className="sr-only" />{item}
                      </label>
                    );
                  })}
                </RadioGroup>
                {style === "Outro" && (
                  <label className="mt-5 block space-y-2 text-sm font-bold text-[#2b1722]">
                    <span>Qual ritmo você deseja? *</span>
                    <Input value={customStyle} onChange={(event) => setCustomStyle(event.target.value)} maxLength={120} placeholder="Ex.: forró eletrônico, samba-rock..." className="h-12 rounded-xl border-rose-300 text-base" />
                  </label>
                )}
                <fieldset className="mt-7">
                  <legend className="text-sm font-bold text-[#2b1722]">Qual voz você prefere?</legend>
                  <RadioGroup value={voicePreference} onValueChange={(value) => setVoicePreference(value as VoicePreference)} className="mt-3 grid gap-3 sm:grid-cols-2">
                    {VOICE_OPTIONS.map((voice) => (
                      <label key={voice.value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${voicePreference === voice.value ? "border-rose-600 bg-rose-50" : "border-rose-200"}`}>
                        <RadioGroupItem value={voice.value} />{voice.label}
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </div>
            )}

            {step === 5 && (
              <div>
                <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100">Etapa 5</Badge>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-[#2b1722] sm:text-4xl">Uma mensagem do coração</h1>
                <p className="mt-2 text-base font-semibold text-rose-900">Opcional</p>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">Escreva qualquer coisa que você sinta que seria relevante incluir na música, e faremos o nosso melhor para incluí-la.</p>
                <Textarea value={heartMessage} onChange={(event) => setHeartMessage(event.target.value)} maxLength={700} rows={8} placeholder="Ex.: Quero que ela saiba que sempre estarei ao lado dela..." className="mt-6 resize-y rounded-2xl border-rose-200 p-4 text-base leading-relaxed" />
                <p className="mt-2 text-right text-xs font-medium text-muted-foreground">{heartMessage.length}/700 caracteres</p>
              </div>
            )}

            {lyricsError && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-destructive">{lyricsError}</p>}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-rose-100 pt-6">
              <Button variant="ghost" onClick={() => goTo(step === 1 ? 0 : step - 1)} className="rounded-full font-bold"><ArrowLeft className="mr-2 size-4" /> Voltar</Button>
              <Button onClick={continueBriefing} disabled={lyricsBusy} size="lg" className="h-13 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-7 font-extrabold text-white shadow-lg shadow-rose-900/20">
                {lyricsBusy ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Criando letra...</> : step === 5 ? <>Gerar minha letra <Sparkles className="ml-2 size-4" /></> : <>Continuar <ArrowRight className="ml-2 size-4" /></>}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 0: Rich Landing Experience + Creation Studio */}
      {false && step === 0 && (
        <div className="relative">
          {/* HERO SECTION */}
          <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
            {/* Background Ambient Lights */}
            <div className="pointer-events-none absolute left-1/2 -top-24 -translate-x-1/2 size-[650px] rounded-full bg-gradient-to-tr from-rose-300/30 to-pink-200/20 blur-[100px]" />
            <div className="pointer-events-none absolute right-10 top-1/3 size-72 rounded-full bg-amber-200/20 blur-[80px]" />

            <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/90 px-4 py-1.5 text-xs font-semibold tracking-wide text-rose-950 shadow-sm backdrop-blur-md">
                <span className="flex text-amber-400">
                  <Star className="size-3.5 fill-amber-400" />
                  <Star className="size-3.5 fill-amber-400" />
                  <Star className="size-3.5 fill-amber-400" />
                  <Star className="size-3.5 fill-amber-400" />
                  <Star className="size-3.5 fill-amber-400" />
                </span>
                <span className="text-rose-300">|</span>
                <span>+1.200 canções entregues para emocionar quem você ama</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-7 font-display text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-[4.4rem] lg:leading-[1.1] text-[#2b1722]">
                Transforme a história de vocês em uma{" "}
                <span className="bg-gradient-to-r from-[#8b2450] via-[#c04675] to-[#73193f] bg-clip-text text-transparent">
                  música inesquecível.
                </span>
              </h1>

              {/* Emotional Subtitle */}
              <p className="mx-auto mt-6 max-w-3xl text-lg sm:text-xl text-muted-foreground leading-relaxed font-normal">
                Dê os detalhes, piadas internas e memórias que só vocês compartilham. Escrevemos a letra, você aprova cada verso e ouve uma prévia em minutos.
              </p>

              {/* CTA Action Buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => scrollToSection("criar")}
                  className="h-14 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-8 text-base font-bold text-white shadow-xl shadow-rose-900/25 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <Gift className="size-5 mr-2" />
                  Criar Minha Música Agora
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("exemplos")}
                  className="h-14 rounded-full border-2 border-rose-300/80 bg-white/80 px-7 text-base font-semibold text-[#2b1722] hover:bg-rose-50 hover:border-rose-400 transition backdrop-blur-md"
                >
                  <Volume2 className="size-5 mr-2 text-rose-700" />
                  Ouvir Amostras Reais
                </Button>
              </div>

              {/* Hero Key Guarantees */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs sm:text-sm font-medium text-[#422030]">
                <div className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-rose-100 text-rose-700">
                    <Check className="size-3 font-bold" />
                  </span>
                  <span>Você lê e aprova a letra antes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-rose-100 text-rose-700">
                    <Check className="size-3 font-bold" />
                  </span>
                  <span>1 ajuste gratuito de estilo incluído</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-rose-100 text-rose-700">
                    <Check className="size-3 font-bold" />
                  </span>
                  <span>Pagamento único de R$ 19,90</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: AUDIO SHOWCASE */}
          <div id="exemplos" className="mx-auto max-w-7xl px-4 sm:px-8">
            <AudioShowcase
              onStartCreating={(chosenStyle) => {
                setStyle(chosenStyle);
                scrollToSection("criar");
              }}
            />
          </div>

          {/* SECTION: HOW IT WORKS */}
          <div id="como-funciona">
            <HowItWorks />
          </div>

          {/* SECTION: CREATION STUDIO (WIZARD STEP 0) */}
          <section id="criar" className="relative my-16 scroll-mt-28 mx-auto max-w-7xl px-4 sm:px-8">
            <div className="mb-10 text-center">
              <Badge className="rounded-full bg-rose-100 text-rose-900 border-0 px-4 py-1 text-xs font-semibold">
                ESTÚDIO DE CRIAÇÃO
              </Badge>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#2b1722]">
                Conte a sua história
              </h2>
              <p className="mt-2 text-base text-muted-foreground max-w-2xl mx-auto">
                Preencha os dados abaixo e veja a capa do seu disco sendo criada ao vivo ao lado.
              </p>
            </div>

            {/* Stepper indicator */}
            <nav aria-label="Etapas do pedido" className="mb-10 overflow-x-auto pb-2 scrollbar-none">
              <ol className="flex min-w-max items-center justify-center gap-2 mx-auto">
                {steps.map((label, index) => (
                  <li key={label} className="flex items-center gap-2">
                    <button
                      onClick={() => goTo(index)}
                      aria-current={step === index ? "step" : undefined}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                        step === index
                          ? "bg-[#2b1722] text-white shadow-md"
                          : index < step
                          ? "bg-rose-100 text-rose-900 font-bold"
                          : "text-muted-foreground hover:bg-rose-50 border border-transparent"
                      }`}
                    >
                      <span
                        className={`grid size-5 place-items-center rounded-full text-[0.7rem] ${
                          index < step ? "bg-rose-600 text-white" : "border border-current"
                        }`}
                      >
                        {index < step ? <Check className="size-3" /> : index + 1}
                      </span>
                      {label}
                    </button>
                    {index < 5 && <span className="h-px w-6 bg-rose-200" />}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Two column grid: Form + Live Album Preview */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:gap-12">
              <div className="rounded-[32px] border border-rose-200/80 bg-white/95 p-6 sm:p-10 shadow-xl shadow-rose-900/5 backdrop-blur-xl">
                <div className="space-y-8">
                  {/* Occasion Selection */}
                  <fieldset>
                    <legend className="mb-3 text-base font-bold text-[#2b1722] flex items-center justify-between">
                      <span>1. Para quem é a música?</span>
                      <span className="text-xs font-normal text-muted-foreground">Escolha uma opção</span>
                    </legend>
                    <RadioGroup value={occasion} onValueChange={setOccasion} className="grid grid-cols-2 gap-3">
                      {occasionsConfig.map((item) => {
                        const Icon = item.icon;
                        const isSelected = occasion === item.label;
                        return (
                          <label
                            key={item.label}
                            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition-all ${
                              isSelected
                                ? "border-rose-600 bg-rose-50/80 text-rose-950 shadow-sm ring-2 ring-rose-500/20"
                                : "border-rose-100/90 bg-white/60 hover:border-rose-300 hover:bg-rose-50/40"
                            }`}
                          >
                            <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${isSelected ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700"}`}>
                              <Icon className="size-4" />
                            </span>
                            <RadioGroupItem value={item.label} className="sr-only" />
                            <span className="font-bold">{item.label}</span>
                          </label>
                        );
                      })}
                    </RadioGroup>

                    {occasion === "Outro" && (
                      <div className="mt-4 rounded-2xl border-2 border-rose-400/70 bg-gradient-to-r from-rose-50/90 to-pink-50/90 p-4 sm:p-5 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                        <label className="block space-y-2 text-sm font-bold text-[#2b1722]">
                          <span className="flex items-center gap-2">
                            <PenTool className="size-4 text-rose-700" />
                            <span>Para quem é a música? *</span>
                          </span>
                          <Input
                            value={customOccasion}
                            onChange={(event) => setCustomOccasion(event.target.value)}
                            placeholder="Ex.: avó, professor(a), chefe, colega de trabalho..."
                            maxLength={80}
                            className="h-12 rounded-xl border-rose-300 bg-white px-4 text-base focus-visible:ring-rose-500 shadow-sm"
                          />
                        </label>
                        <p className="mt-2 text-xs text-rose-900/80 font-medium">
                          Essa informação ajuda a deixar a letra mais pessoal e adequada à relação de vocês.
                        </p>
                      </div>
                    )}
                  </fieldset>

                  {/* Names & Pronunciation */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-bold text-[#2b1722]">
                      <span>Qual é o nome da pessoa homenageada? *</span>
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ex.: Marina, Minha Mãe, Lucas..."
                        className="h-12 rounded-xl border-rose-200 bg-background px-4 text-base focus-visible:ring-rose-500"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-bold text-[#2b1722]">
                      <span className="flex items-center justify-between">
                        <span>Apelido Carinhoso</span>
                        <span className="text-xs font-normal text-muted-foreground">Opcional</span>
                      </span>
                      <Input
                        value={pronunciation}
                        onChange={(event) => setPronunciation(event.target.value)}
                        placeholder="Ex.: Mari, Amor, Pretinha..."
                        className="h-12 rounded-xl border-rose-200 bg-background px-4 text-base focus-visible:ring-rose-500"
                      />
                    </label>
                  </div>

                  {/* Story Textarea & Inspirational Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-[#2b1722]">
                        Conte a história e os momentos especiais *
                      </label>
                      <span className="text-xs font-medium text-muted-foreground">
                        {story.length}/4.000 caracteres (mínimo 200)
                      </span>
                    </div>

                    {/* Inspiration chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      <span className="text-xs font-semibold text-rose-800 flex items-center gap-1 mr-1">
                        <Sparkles className="size-3" /> Ideias:
                      </span>
                      {inspirationPrompts.map((promptText, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => addInspirationPrompt(promptText)}
                          className="rounded-full border border-rose-200 bg-rose-50/60 px-2.5 py-1 text-[0.7rem] font-medium text-rose-900 hover:bg-rose-100 transition"
                        >
                          + {promptText.split(":")[0]}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      value={story}
                      onChange={(event) => setStory(event.target.value)}
                      maxLength={4000}
                      rows={6}
                      placeholder="Conte como se conheceram, apelidos carinhosos, piadas internas, viagens, dificuldades superadas e a mensagem principal que você quer transmitir no refrão..."
                      className="resize-y rounded-2xl border-rose-200 bg-background p-4 text-base leading-relaxed focus-visible:ring-rose-500"
                    />
                  </div>

                  {/* Musical Style selector */}
                  <fieldset>
                    <legend className="mb-3 text-base font-bold text-[#2b1722] flex items-center justify-between">
                      <span>Que som combina mais com vocês?</span>
                      <span className="text-xs font-normal text-muted-foreground">1 ajuste grátis se quiser trocar</span>
                    </legend>
                    <RadioGroup value={style} onValueChange={setStyle} className="flex flex-wrap gap-2.5">
                      {styles.map((item) => {
                        const isSelected = style === item;
                        return (
                          <label
                            key={item}
                            className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${
                              isSelected
                                ? "border-rose-700 bg-gradient-to-r from-[#8b2450] to-[#b94970] text-white shadow-md shadow-rose-900/10 scale-105"
                                : "border-rose-200 bg-white text-[#2b1722] hover:border-rose-400 hover:bg-rose-50/50"
                            }`}
                          >
                            <RadioGroupItem value={item} className="sr-only" />
                            {item}
                          </label>
                        );
                      })}
                    </RadioGroup>

                    {style === "Outro" && (
                      <label className="mt-4 block space-y-2 text-sm font-bold text-[#2b1722]">
                        <span>Qual ritmo você deseja? *</span>
                        <Input
                          value={customStyle}
                          onChange={(event) => setCustomStyle(event.target.value)}
                          placeholder="Ex.: forró eletrônico, samba-rock, reggae romântico..."
                          maxLength={120}
                          className="h-12 rounded-xl border-rose-300 bg-white px-4 text-base focus-visible:ring-rose-500"
                        />
                      </label>
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="mb-3 text-base font-bold text-[#2b1722]">
                      Você prefere a música com qual voz?
                    </legend>
                    <RadioGroup
                      value={voicePreference}
                      onValueChange={(value) => setVoicePreference(value as VoicePreference)}
                      className="grid max-w-xl gap-3 sm:grid-cols-2"
                    >
                      {VOICE_OPTIONS.map((voice) => {
                        const isSelected = voicePreference === voice.value;
                        return (
                          <label
                            key={voice.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                              isSelected
                                ? "border-rose-700 bg-rose-50 text-rose-950 shadow-sm"
                                : "border-rose-200 bg-white text-[#2b1722] hover:border-rose-400"
                            }`}
                          >
                            <RadioGroupItem value={voice.value} />
                            {voice.label}
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </fieldset>

                  {/* Submission & error alert */}
                  <div className="flex flex-col gap-4 border-t border-rose-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <LockKeyhole className="size-4 text-rose-600" />
                        Você poderá revisar cada verso da letra antes de gravar.
                      </p>
                      {lyricsError && (
                        <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
                          {lyricsError}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => void createLyricDraft()}
                      disabled={lyricsBusy}
                      size="lg"
                      className="h-14 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-8 text-base font-bold text-white shadow-lg shadow-rose-900/20 hover:scale-105 active:scale-95 transition"
                    >
                      {lyricsBusy ? (
                        <>
                          <LoaderCircle className="animate-spin mr-2" /> Escrevendo a letra...
                        </>
                      ) : (
                        <>
                          Criar Minha Letra <ArrowRight className="ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Live Album Sleeve Artwork */}
              <LiveAlbumPreview recipient={name} occasion={effectiveOccasion} style={effectiveStyle || "Seu ritmo"} />
            </div>
          </section>

          {/* TESTIMONIALS, PRICING & FAQ */}
          <div id="depoimentos">
            <div id="duvidas">
              <TestimonialsPricingFaq onStart={() => scrollToSection("criar")} />
            </div>
          </div>

          <LandingFooter />
        </div>
      )}

      {/* ETAPA 6: REVISÃO MANUAL DA LETRA */}
      {step === 6 && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:py-12">
          {/* Top Breadcrumb & Step Navigation */}
          <div className="mb-8 flex items-center justify-between">
            <Button variant="ghost" className="rounded-full text-sm font-semibold" onClick={() => goTo(5)}>
              <ArrowLeft className="mr-1.5 size-4" /> Voltar à mensagem
            </Button>
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-900 bg-rose-50 px-3.5 py-1.5 rounded-full">
              <Sparkles className="size-3.5 text-rose-600" />
              <span>Etapa 6 de 8: Revise sua letra</span>
            </div>
          </div>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="rounded-[32px] border border-rose-200/80 bg-white/95 p-6 sm:p-10 shadow-xl shadow-rose-900/5 backdrop-blur-xl">
              <Badge className="mb-4 rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100 font-semibold border-0">
                {lyricsMode === "mock" ? "Rascunho simulado · revise tudo" : "Letra pronta para revisão"}
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#2b1722]">
                Sua história ganhou versos poéticos.
              </h1>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                Leia com carinho. Você tem total liberdade para editar qualquer palavra, adicionar detalhes ou alterar o refrão. A música só será composta após a sua aprovação.
              </p>

              <div className="mt-7 relative">
                <Textarea
                  value={lyrics}
                  onChange={(event) => setLyrics(event.target.value)}
                  aria-label="Letra da música"
                  className="min-h-[480px] resize-y rounded-2xl border border-rose-200 bg-[#fffbfa] p-6 font-serif text-base sm:text-lg leading-loose shadow-inner focus-visible:ring-rose-500"
                />
                <span className="absolute right-4 bottom-4 text-xs text-muted-foreground/60 bg-white/80 px-2 py-1 rounded-md">
                  Clique no texto para editar
                </span>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-rose-100 pt-6">
                <Button variant="ghost" size="lg" className="rounded-full font-semibold" onClick={() => goTo(5)}>
                  <ArrowLeft className="mr-2 size-4" /> Voltar à mensagem
                </Button>
                <div className="space-y-2 text-right">
                  {orderError && (
                    <p role="alert" className="text-sm font-semibold text-destructive">
                      {orderError}
                    </p>
                  )}
                  <Button
                    size="lg"
                    className="h-14 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-8 text-base font-bold text-white shadow-lg shadow-rose-900/20 hover:scale-105 active:scale-95 transition"
                    disabled={orderBusy || !lyrics.trim()}
                    onClick={() => void startGeneration()}
                  >
                    {orderBusy ? (
                      <>
                        <LoaderCircle className="animate-spin mr-2" /> Gravando pedido...
                      </>
                    ) : (
                      <>
                        Aprovar Letra e Criar Música <Music2 className="ml-2 size-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar Summary */}
            <aside className="space-y-5">
              <div className="rounded-3xl border border-rose-200/80 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-900">Resumo do Pedido</p>
                <dl className="mt-4 space-y-4 text-sm">
                  <div className="border-b border-rose-50 pb-3">
                    <dt className="text-xs text-muted-foreground">Homenageado(a)</dt>
                    <dd className="font-bold text-base text-[#2b1722]">{name || "Pessoa especial"}</dd>
                  </div>
                  <div className="border-b border-rose-50 pb-3">
                    <dt className="text-xs text-muted-foreground">Para quem</dt>
                    <dd className="font-bold text-base text-[#2b1722]">{effectiveOccasion}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Estilo Musical</dt>
                    <dd className="font-bold text-base text-rose-900">{effectiveStyle}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Voz escolhida</dt>
                    <dd className="font-bold text-base text-rose-900">
                      {voicePreference === "masculina" ? "Masculina" : "Feminina"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-amber-200/60 bg-amber-50/70 p-6 text-sm leading-relaxed text-amber-950">
                <Sparkles className="mb-2 size-5 text-amber-600" />
                <strong className="block text-base font-bold">Esta revisão não consome seu ajuste.</strong>
                <p className="mt-1 text-xs text-amber-900/80">
                  O ajuste de estilo gratuito incluído só é contabilizado após a primeira prévia musical gerada.
                </p>
              </div>
            </aside>
          </section>
        </div>
      )}

      {/* ETAPA 7: GERAÇÃO EM ANDAMENTO */}
      {step === 7 && generation !== "ready" && (
        <>
          {generation === "loading" && (
            <GenerationProgressStage
              recipient={name}
              progress={generationProgress}
              mode={generationMode}
              taskStatus={generationTaskStatus}
              pollingWarning={generationPollingWarning}
            />
          )}

          {generation === "error" && (
            <section className="mx-auto max-w-3xl px-4 py-16">
              <div className="rounded-[36px] border border-rose-200/80 bg-white p-8 text-center shadow-2xl shadow-rose-900/10 sm:p-14">
              <>
                <div className="mx-auto grid size-24 place-items-center rounded-full bg-destructive/10">
                  <RotateCcw className="size-10 text-destructive" />
                </div>
                <Badge variant="destructive" className="mt-6 rounded-full font-semibold">
                  Não foi possível concluir
                </Badge>
                <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-[#2b1722]">
                  Sua história está segura.
                </h1>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Ocorreu uma instabilidade no servidor de áudio. Nenhum crédito foi consumido e a sua letra continua salva.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button variant="outline" className="rounded-full font-semibold" onClick={() => goTo(6)}>
                    <ArrowLeft className="mr-1.5 size-4" /> Rever letra
                  </Button>
                  <Button
                    className="rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] font-bold text-white shadow-md"
                    onClick={() => {
                      setGenerationProgress(0);
                      setGenerationTaskStatus(null);
                      setGenerationPollingWarning(false);
                      setGeneration("loading");
                    }}
                  >
                    <RotateCcw className="mr-1.5 size-4" /> Tentar novamente
                  </Button>
                </div>
              </>
              </div>
            </section>
          )}
        </>
      )}

      {step === 7 && generation === "ready" && generationMode === "live" && persistedOrderId && (
        <GenerationReadyStage recipient={name} orderId={persistedOrderId} style={effectiveStyle} />
      )}

      {/* ETAPA 7: PRÉVIA E CONVERSÃO PARA COMPRA */}
      {step === 7 && generation === "ready" && (generationMode !== "live" || !persistedOrderId) && (
        <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-10 sm:px-8">
          <div className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-rose-200/35 blur-3xl" />
          <div className="relative mb-8 flex flex-col justify-between gap-6 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#2b0c1c] via-[#551733] to-[#8b2450] p-7 text-white shadow-2xl sm:p-10 lg:flex-row lg:items-end">
            <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[38px] border-white/[.05]" />
            <div>
              <Badge className="mb-4 rounded-full border border-white/15 bg-white/10 text-rose-100 font-semibold hover:bg-white/10">
                Demonstração visual da amostra
              </Badge>
              <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
                Imagine a história de {name || "quem você ama"} tocando assim.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Esta tela demonstra a experiência de escolha. Uma geração real exibirá aqui os arquivos privados produzidos para o seu pedido.
              </p>
            </div>
            <Badge variant="outline" className="relative rounded-full border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <WandSparkles className="mr-1 size-3.5 text-rose-200" /> 1 ajuste de estilo incluído
            </Badge>
          </div>

          <RadioGroup value={selected} onValueChange={setSelected} className="relative grid gap-6 lg:grid-cols-2">
            {[
              {
                id: "original",
                title: `Você é meu lugar (${name})`,
                label: "Versão Original",
                detail: effectiveStyle,
                art: "bg-gradient-to-br from-[#40182b] via-[#6e2343] to-[#240a17]",
              },
              {
                id: "ajuste",
                title: `Nosso melhor verso (${name})`,
                label: "Ajuste Alternativo",
                detail: `${effectiveStyle} · Mais acústico e intimista`,
                art: "bg-gradient-to-br from-[#3b1d2b] via-[#815636] to-[#1c0d16]",
              },
            ].map((version) => (
              <label
                key={version.id}
                className={`group cursor-pointer overflow-hidden rounded-[32px] border-2 bg-white transition-all duration-300 ${
                  selected === version.id
                    ? "border-rose-600 shadow-2xl shadow-rose-900/15 ring-2 ring-rose-500/20 scale-[1.01]"
                    : "border-rose-100 hover:border-rose-300 shadow-sm"
                }`}
              >
                <RadioGroupItem value={version.id} className="sr-only" />

                {/* Album Header Art */}
                <div className={`relative h-48 overflow-hidden p-6 text-white ${version.art}`}>
                  <div className="pointer-events-none absolute -bottom-16 -right-10 size-52 rounded-full border-[28px] border-white/10" />
                  <Badge className="bg-white/15 text-white hover:bg-white/15 border-0 font-medium text-xs backdrop-blur-md">
                    {version.label}
                  </Badge>
                  <Music2 className="absolute bottom-6 left-6 size-10 text-white/70" />
                  {selected === version.id && (
                    <span className="absolute right-5 top-5 grid size-8 place-items-center rounded-full bg-white text-rose-700 shadow-md">
                      <Check className="size-4 font-bold" />
                    </span>
                  )}
                </div>

                {/* Visual da versão demonstrativa — nenhum áudio é simulado. */}
                <div className="p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-[#2b1722]">{version.title}</h2>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                        {version.detail} · apresentação do layout
                      </p>
                    </div>
                    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-800" aria-hidden="true"><LockKeyhole className="size-5" /></span>
                  </div>

                  <div className="mt-6 flex h-12 items-center gap-1.5 overflow-hidden rounded-2xl bg-rose-50/60 p-2.5">
                    {waveform.map((height, index) => (
                      <span
                        key={index}
                        className="w-full rounded-full bg-rose-200"
                        style={{ height: `${Math.max(18, height * 0.5)}%` }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950">
                    Demonstração sem áudio: nenhum MP3 foi criado neste modo. As gerações reais aparecem com player na área “Meus pedidos”.
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>

          {/* Action bar */}
          <div className="mt-8 flex flex-col gap-5 rounded-3xl border border-rose-200 bg-gradient-to-r from-white to-rose-50 p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100">Sua música está pronta</Badge>
              <p className="mt-3 font-display text-2xl font-extrabold text-[#2b1722]">
                Leve a emoção completa para {name}.
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Libere a música inteira em MP3, pronta para baixar, e uma página bonita para apresentar e compartilhar o presente.
              </p>
              <p className="mt-3 text-sm font-extrabold text-rose-900">Pagamento único de R$ 19,90 · sem assinatura</p>
            </div>
            <Button
              size="lg"
              className="h-14 shrink-0 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-8 text-base font-extrabold text-white shadow-xl shadow-rose-900/20 hover:scale-105 active:scale-95 transition"
              onClick={() => goTo(9)}
            >
              Quero minha música inteira <ArrowRight className="ml-2" />
            </Button>
          </div>
        </section>
      )}

      {/* PAGAMENTO ENTRE AS ETAPAS 7 E 8 */}
      {step === 9 && (
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-[32px] border border-rose-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-rose-900/5">
            <Badge className="mb-4 rounded-full bg-rose-100 text-rose-900 font-semibold border-0">
              Pagamento 100% Seguro
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2b1722]">
              Finalize o seu presente.
            </h1>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Após o pagamento, a música completa em MP3 e a página exclusiva de presente são liberadas imediatamente.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-[#2b1722]">
                <span>Nome completo</span>
                <Input placeholder="Nome completo" className="h-12 rounded-xl border-rose-200" />
              </label>
              <label className="space-y-2 text-sm font-bold text-[#2b1722]">
                <span>E-mail para entrega</span>
                <Input type="email" placeholder="exemplo@exemplo.com" className="h-12 rounded-xl border-rose-200" />
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-6">
              <div className="flex items-center gap-3">
                <Clock3 className="size-6 text-amber-700 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-[#2b1722]">Aguardando confirmação Pix</p>
                  <p className="text-xs text-muted-foreground">
                    Assim que aprovado pelo banco, o áudio completo de 3min24s é liberado sem recarregar a tela.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-rose-100 pt-6">
              <Button variant="ghost" className="rounded-full font-semibold" onClick={() => goTo(7)}>
                <ArrowLeft className="mr-1.5 size-4" /> Trocar versão
              </Button>
              <Button
                size="lg"
                className="h-14 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] px-8 text-base font-bold text-white shadow-xl shadow-rose-900/20 hover:scale-105 active:scale-95 transition"
                onClick={() => {
                  setPaid(true);
                  goTo(8);
                }}
              >
                Simular Pagamento Aprovado <LockKeyhole className="ml-2 size-4" />
              </Button>
            </div>
          </div>

          {/* Checkout sidebar */}
          <aside className="rounded-[32px] bg-gradient-to-b from-[#351426] to-[#240a18] p-7 text-white shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-200">Resumo do Pedido</p>
            <div className="mt-6 flex items-center gap-4 border-b border-white/10 pb-6">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white">
                <Music2 className="size-7" />
              </div>
              <div>
                <p className="font-display text-lg font-bold">
                  {selected === "original" ? `Você é meu lugar (${name})` : `Nosso melhor verso (${name})`}
                </p>
                <p className="text-xs text-white/70">Para {name} · {effectiveStyle}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-white/70">Música Personalizada Completa</dt>
                <dd className="font-semibold">R$ 19,90</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/70">Página Web de Presente com Dedicatória</dt>
                <dd className="font-semibold text-emerald-300">Incluída</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/70">Arquivo MP3 Masterizado</dt>
                <dd className="font-semibold text-emerald-300">Incluído</dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-white/10 pt-5 flex items-baseline justify-between">
              <span className="text-white/70 text-sm">Total</span>
              <strong className="font-display text-3xl font-extrabold text-white">R$ 19,90</strong>
            </div>

            <p className="mt-6 flex items-center gap-2 text-[0.7rem] text-white/50 leading-relaxed">
              <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
              Ambiente protegido. Sem recorrência ou cobranças posteriores.
            </p>
          </aside>
        </section>
      )}

      {/* ETAPA 8: ENTREGA E PÁGINA DO PRESENTE */}
      {step === 8 && (
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
          <div className="overflow-hidden rounded-[36px] bg-gradient-to-br from-[#351426] via-[#4d1936] to-[#250a18] text-white shadow-2xl">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative p-8 sm:p-12 flex flex-col justify-between">
                <div className="pointer-events-none absolute -left-20 -top-24 size-80 rounded-full bg-rose-400/20 blur-3xl" />

                <div>
                  <Badge className="rounded-full bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/20 border-0 text-xs font-semibold px-3 py-1">
                    <CheckCircle2 className="size-3.5 mr-1" />
                    {paid ? "Pagamento Confirmado" : "Demonstração da Entrega"}
                  </Badge>

                  <Gift className="mt-8 size-14 text-rose-300" />
                  <h1 className="mt-5 font-display text-4xl sm:text-5xl font-extrabold leading-tight">
                    O presente de {name}<br />está pronto!
                  </h1>
                  <p className="mt-4 text-white/75 text-sm sm:text-base leading-relaxed max-w-sm">
                    A versão final completa foi liberada com áudio em alta fidelidade. Agora é só emocionar quem você ama!
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-xs text-white/60">
                  <span>Pedido finalizado com sucesso no Te Cantei.</span>
                </div>
              </div>

              {/* Gift Presentation Card */}
              <div className="m-4 sm:m-6 rounded-[28px] bg-[#fffaf8] p-6 text-foreground sm:p-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-rose-800">
                    Dedicatória para {name}
                  </span>
                  <Badge className="bg-rose-100 text-rose-900 border-0 text-xs">{effectiveStyle}</Badge>
                </div>

                <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-[#2b1722]">
                  {selected === "original" ? `Você é meu lugar (${name})` : `Nosso melhor verso (${name})`}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  Música completa · 3 minutos e 24 segundos
                </p>

                {/* Entrega demonstrativa — nunca simula um arquivo completo. */}
                <div className="mt-6 rounded-2xl bg-white p-5 border border-rose-200/80 shadow-sm">
                  <div className="flex items-center gap-4" aria-label="Demonstração sem arquivo de áudio">
                    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-800"><LockKeyhole className="size-5" /></span>
                    <div className="flex h-12 flex-1 items-center gap-1.5 overflow-hidden">
                      {waveform.map((height, index) => (
                        <span
                          key={index}
                          className="w-full rounded-full bg-rose-200"
                          style={{ height: `${Math.max(20, height * 0.55)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-amber-950">Este é somente o modelo da página de entrega. Uma música completa real só aparece depois da geração e da liberação do pedido.</p>
                </div>

                {/* Actions */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Button type="button" size="lg" className="h-12 rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] text-white font-bold" onClick={openOrderDelivery}>
                    <Download className="mr-2 size-4" /> Abrir entrega e baixar
                  </Button>
                  <Button type="button" size="lg" variant="outline" className="h-12 rounded-full border-rose-300 font-bold text-rose-950 hover:bg-rose-50" onClick={openOrderDelivery}>
                    <Share2 className="mr-2 size-4 text-rose-700" /> Criar link do presente
                  </Button>
                </div>

                {deliveryNotice && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-950">{deliveryNotice}</p>}

                <div className="mt-6 rounded-2xl bg-rose-50/70 p-4 text-xs text-[#3d182b] border border-rose-200/60">
                  <div className="flex items-start gap-2.5">
                    <LockKeyhole className="mt-0.5 size-4 shrink-0 text-rose-700" />
                    <p>
                      <strong>Link privado e seguro.</strong><br />
                      A pessoa presenteada terá acesso à página especial sem ver rascunhos ou informações financeiras.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Button variant="ghost" className="rounded-full font-bold text-sm" onClick={() => goTo(0)}>
              ← Criar outra música
            </Button>
          </div>
        </section>
      )}

      {/* MODAL: AUTHENTICATION (SIGN IN / SIGN UP) */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="rounded-[32px] p-0 sm:max-w-md border-rose-200">
          <form
            className="p-6 sm:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              void continueWithAccount();
            }}
          >
            <DialogHeader>
              <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-800">
                <LockKeyhole className="size-6" />
              </div>
              <DialogTitle className="font-display text-2xl sm:text-3xl font-bold text-[#2b1722]">
                {accountMode === "sign_in" ? "Entre para salvar sua música" : "Crie sua conta no Te Cantei"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Sua conta guarda a letra, as prévias e os pedidos concluídos com total segurança.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 rounded-2xl bg-rose-50/80 p-1 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMode("sign_in");
                    setAccountError("");
                    setAccountMessage("");
                  }}
                  className={`rounded-xl py-2 transition ${
                    accountMode === "sign_in" ? "bg-white text-rose-950 shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMode("sign_up");
                    setAccountError("");
                    setAccountMessage("");
                  }}
                  className={`rounded-xl py-2 transition ${
                    accountMode === "sign_up" ? "bg-white text-rose-950 shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <label className="block space-y-1.5 text-sm font-bold text-[#2b1722]">
                <span>E-mail</span>
                <Input
                  type="email"
                  autoComplete="email"
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                  placeholder="exemplo@exemplo.com"
                  className="h-12 rounded-xl border-rose-200"
                  required
                />
              </label>

              <label className="block space-y-1.5 text-sm font-bold text-[#2b1722]">
                <span>Senha</span>
                <Input
                  type="password"
                  autoComplete={accountMode === "sign_up" ? "new-password" : "current-password"}
                  value={accountPassword}
                  onChange={(event) => setAccountPassword(event.target.value)}
                  className="h-12 rounded-xl border-rose-200"
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </label>

              {accountMode === "sign_in" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => void sendPasswordReset()}
                    className="text-xs font-semibold text-rose-800 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {accountError && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                  {accountError}
                </p>
              )}
              {accountMessage && (
                <p role="status" className="rounded-xl bg-emerald-100 px-4 py-3 text-xs font-semibold text-emerald-950">
                  {accountMessage}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="submit"
                size="lg"
                className="h-14 w-full rounded-full bg-gradient-to-r from-[#8b2450] to-[#b94970] text-base font-bold text-white shadow-lg shadow-rose-900/20"
                disabled={accountBusy}
              >
                {accountBusy ? (
                  <>
                    <LoaderCircle className="animate-spin mr-2" /> Aguarde...
                  </>
                ) : (
                  <>
                    {accountMode === "sign_in" ? "Entrar com e-mail" : "Criar minha conta"} <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
