"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use pelo menos 8 caracteres.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("A recuperação estará disponível quando o Supabase for configurado.");
      return;
    }

    setBusy(true);
    setError("");
    const result = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (result.error) {
      setError("O link expirou ou não é válido. Solicite uma nova recuperação.");
      return;
    }
    setDone(true);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-[28px] border bg-card p-7 shadow-[0_24px_70px_rgba(54,16,38,.08)] sm:p-9">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          {done ? <CheckCircle2 /> : <LockKeyhole />}
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">
          {done ? "Senha atualizada" : "Crie uma nova senha"}
        </h1>
        {done ? (
          <div className="mt-5 space-y-5">
            <p className="text-muted-foreground">Você já pode voltar e entrar na sua conta.</p>
            <Button asChild className="w-full rounded-full"><Link href="/">Voltar ao Te Cantei</Link></Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={updatePassword}>
            <label className="block space-y-2 text-sm font-semibold">
              Nova senha
              <Input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl text-base" required />
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="h-12 w-full rounded-full" disabled={busy}>
              {busy ? <><LoaderCircle className="animate-spin" /> Aguarde</> : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
