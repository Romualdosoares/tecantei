"use client";

import Link from "next/link";
import { LockKeyhole, Heart, Shield } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function LandingFooter() {
  return (
    <footer className="mt-28 border-t border-rose-200/60 bg-gradient-to-b from-[#fffaf8] to-[#fdf2f4] py-14 text-sm text-muted-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Brand & info */}
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo className="w-28 transition duration-500 hover:scale-[1.03]" />
            </Link>
            <p className="max-w-sm text-xs text-muted-foreground leading-5">
              Transformamos histórias de amor, memórias familiares e momentos únicos em canções inesquecíveis.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-[#482035]">
            <Link href="/pedidos" className="hover:text-rose-800 transition">
              Meus Pedidos
            </Link>
            <Link href="/suporte" className="hover:text-rose-800 transition">
              Suporte & Dúvidas
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="flex items-center gap-1 text-emerald-800">
              <Shield className="size-3.5 text-emerald-600" />
              Pagamento Seguro
            </span>
            <span className="flex items-center gap-1 text-rose-800">
              <LockKeyhole className="size-3.5 text-rose-600" />
              Privacidade Garantida
            </span>
          </div>
        </div>

        <div className="mt-10 border-t border-rose-200/40 pt-6 flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground/80 sm:flex-row">
          <p>© {new Date().getFullYear()} Te Cantei. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Feito com <Heart className="size-3.5 fill-rose-500 text-rose-500 inline" /> e muita música no Brasil.
          </p>
        </div>
      </div>
    </footer>
  );
}
