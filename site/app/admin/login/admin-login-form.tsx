"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const GENERIC_ACCESS_ERROR = "E-mail, senha ou permissão administrativa inválidos.";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("O acesso administrativo está temporariamente indisponível.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (result.error) {
      setBusy(false);
      setError(GENERIC_ACCESS_ERROR);
      return;
    }

    const verification = await fetch("/api/admin/session", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    }).catch(() => null);

    if (!verification?.ok) {
      await supabase.auth.signOut();
      setBusy(false);
      setError(GENERIC_ACCESS_ERROR);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setError("Informe seu e-mail para receber o link de recuperação.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("A recuperação de senha está temporariamente indisponível.");
      return;
    }

    setResetBusy(true);
    setError("");
    setMessage("");
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
    });
    setResetBusy(false);
    setMessage("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffaf8] px-5 py-8 text-[#2b1722] sm:py-12">
      <div className="pointer-events-none absolute -left-28 top-12 size-80 rounded-full bg-rose-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#7e2148]/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3" aria-label="Voltar para a página inicial do Te Cantei">
            <Image src="/te-cantei-logo.png" alt="Te Cantei" width={44} height={44} priority className="size-11 object-contain transition group-hover:scale-105" />
            <div>
              <p className="font-display text-2xl font-bold leading-none">Te Cantei</p>
              <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8b2450]">Central administrativa</p>
            </div>
          </Link>
          <Button asChild variant="ghost" className="rounded-full text-muted-foreground hover:text-[#7e2148]">
            <Link href="/"><ArrowLeft /> Voltar ao site</Link>
          </Button>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.9fr] lg:py-16">
          <section className="hidden max-w-xl lg:block">
            <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-[#7e2148] text-white shadow-lg shadow-[#7e2148]/20">
              <ShieldCheck className="size-7" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9d315b]">Operação protegida</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.08]">Cuide de cada história em um só lugar.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Acompanhe usuários, gerações, vendas, integrações e auditorias com acesso reservado à equipe autorizada.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-rose-200/70 bg-white/70 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <LockKeyhole className="size-5 shrink-0 text-[#8b2450]" />
              Sessões e permissões são verificadas antes de qualquer dado administrativo ser exibido.
            </div>
          </section>

          <section className="w-full rounded-[30px] border border-rose-200/80 bg-white/95 p-6 shadow-[0_28px_90px_rgba(70,20,43,.12)] backdrop-blur sm:p-9">
            <div className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-[#8b2450] lg:hidden">
              <LockKeyhole />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#9d315b] lg:mt-0">Acesso restrito</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Entrar no painel</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Use o e-mail e a senha da sua conta administrativa.</p>

            <form className="mt-7 space-y-5" onSubmit={signIn}>
              <label className="block space-y-2 text-sm font-bold">
                <span>E-mail administrativo</span>
                <Input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seuemail@empresa.com"
                  className="h-12 rounded-xl border-rose-200 bg-[#fffdfc] text-base"
                  disabled={busy}
                  required
                />
              </label>

              <label className="block space-y-2 text-sm font-bold">
                <span>Senha</span>
                <span className="relative block">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-xl border-rose-200 bg-[#fffdfc] pr-12 text-base"
                    minLength={6}
                    disabled={busy}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted-foreground transition hover:text-[#7e2148] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b2450]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => void sendPasswordReset()}
                  disabled={busy || resetBusy}
                  className="text-xs font-bold text-[#8b2450] hover:underline disabled:opacity-60"
                >
                  {resetBusy ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>

              {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
              {message && <p role="status" className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-950">{message}</p>}

              <Button type="submit" size="lg" className="h-13 w-full rounded-full bg-gradient-to-r from-[#7e2148] to-[#b94970] text-base font-bold text-white shadow-lg shadow-rose-900/20" disabled={busy || resetBusy}>
                {busy ? <><LoaderCircle className="animate-spin" /> Verificando acesso...</> : <>Entrar no painel <ArrowRight /></>}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              Somente contas com permissão administrativa ativa podem continuar.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
