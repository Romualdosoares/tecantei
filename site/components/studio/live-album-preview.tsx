"use client";

import { Disc3, Heart, Music2, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStorefrontPrice } from "@/components/storefront-price-provider";

type AlbumPreviewProps = {
  recipient: string;
  occasion: string;
  style: string;
};

// Distinct artwork gradients per occasion/style
const themeStyles: Record<string, { bg: string; accent: string; discAccent: string }> = {
  "Casal": {
    bg: "from-[#4a122e] via-[#751d45] to-[#2b0c1b]",
    accent: "#f4a2b2",
    discAccent: "#e63968",
  },
  "Aniversário": {
    bg: "from-[#2f1a45] via-[#5b2b7e] to-[#1c0d2e]",
    accent: "#d4a5fc",
    discAccent: "#9333ea",
  },
  "Família": {
    bg: "from-[#42221b] via-[#783e28] to-[#29130d]",
    accent: "#fbd38d",
    discAccent: "#d97706",
  },
  "Amizade": {
    bg: "from-[#132f3c] via-[#1f5970] to-[#0c1c24]",
    accent: "#99f6e4",
    discAccent: "#0d9488",
  },
  "Homenagem": {
    bg: "from-[#2c203b] via-[#523c6b] to-[#171021]",
    accent: "#fed7aa",
    discAccent: "#f97316",
  },
  "Pedido de Casamento": {
    bg: "from-[#59102c] via-[#851b44] to-[#300717]",
    accent: "#ffccd5",
    discAccent: "#e11d48",
  },
  "Maternidade & Bebê": {
    bg: "from-[#3d1933] via-[#662754] to-[#230c1d]",
    accent: "#fbcfe8",
    discAccent: "#ec4899",
  },
  "Conquista & Formatura": {
    bg: "from-[#1c224a] via-[#2a3878] to-[#0f1430]",
    accent: "#fde047",
    discAccent: "#eab308",
  },
  "Despedida & Saudade": {
    bg: "from-[#0d2e2d] via-[#184f4d] to-[#071c1b]",
    accent: "#a7f3d0",
    discAccent: "#10b981",
  },
  "Outros": {
    bg: "from-[#351642] via-[#5c2373] to-[#1e0a26]",
    accent: "#e9d5ff",
    discAccent: "#a855f7",
  },
};

export function LiveAlbumPreview({ recipient, occasion, style }: AlbumPreviewProps) {
  const { formattedPrice } = useStorefrontPrice();
  const currentTheme = themeStyles[occasion] || themeStyles["Casal"];
  const displayName = recipient.trim() ? recipient.trim() : "Alguém Especial";

  return (
    <aside className="lg:pt-2">
      <div className="tc-premium-frame sticky top-28 overflow-hidden rounded-[32px] bg-[#270d1d] text-white shadow-[0_25px_70px_rgba(43,13,30,0.35)] border border-rose-900/30">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-rose-400/20 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-rose-200">
              <Sparkles className="size-3 text-rose-300" />
              PRÉVIA EM TEMPO REAL
            </span>
            <Badge className="bg-rose-500/20 text-rose-200 hover:bg-rose-500/20 border-0 text-xs">
              {style}
            </Badge>
          </div>

          {/* Realistic Vinyl Single Sleeve Mockup */}
          <div className="relative mt-7 flex items-center justify-center py-4">
            {/* Vinyl Record sliding out */}
            <div className="absolute right-4 size-44 sm:size-48 rounded-full bg-[#111113] p-1.5 shadow-2xl border border-white/10 animate-spin-slow">
              {/* Vinyl Grooves */}
              <div className="size-full rounded-full border-[6px] border-[#1d1d21] flex items-center justify-center">
                <div className="size-[85%] rounded-full border-[4px] border-[#25252b] flex items-center justify-center">
                  <div className="size-[70%] rounded-full border-[3px] border-[#1d1d21] flex items-center justify-center">
                    {/* Vinyl Center Label */}
                    <div
                      className="size-16 rounded-full flex flex-col items-center justify-center text-center p-1 shadow-inner"
                      style={{ backgroundColor: currentTheme.discAccent }}
                    >
                      <span className="text-[0.55rem] font-black uppercase text-white tracking-widest">
                        TE CANTEI
                      </span>
                      <Disc3 className="size-3 text-white/80 mt-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Album Cover Sleeve */}
            <div
              className={`relative z-10 size-48 sm:size-52 rounded-2xl bg-gradient-to-br ${currentTheme.bg} p-5 shadow-2xl border border-white/20 flex flex-col justify-between transition-all duration-500`}
            >
              {/* Top Bar of Cover */}
              <div className="flex items-center justify-between">
                <Music2 className="size-5 text-white/80" />
                <Heart className="size-4 fill-rose-300 text-rose-300" />
              </div>

              {/* Cover Title & Subtitle */}
              <div>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-white/60">
                  {occasion}
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold leading-tight text-white drop-shadow-md line-clamp-2">
                  Canção para {displayName}
                </h3>
                <p className="mt-1 text-[0.7rem] font-medium text-white/70">
                  {style} · Produção Exclusiva
                </p>
              </div>

              {/* Bottom badge */}
              <div className="flex items-center justify-between border-t border-white/15 pt-2 text-[0.65rem] text-white/60 font-mono">
                <span>ED. LIMITADA</span>
                <span>2026</span>
              </div>
            </div>
          </div>

          {/* Summary Details */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-200">
              O que você vai receber
            </p>
            <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm text-white/80">
              {[
                "Letra poética escrita com seus detalhes",
                "Revisão e edição de cada verso",
                "Prévia em minutos com 1 ajuste grátis",
                "Página de presente com dedicatória",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-rose-500/30 text-rose-200">
                    <Check className="size-2.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pricing Banner */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
          <div>
            <p className="text-[0.7rem] uppercase tracking-widest text-white/60 font-medium">
              Investimento
            </p>
            <p className="text-xs text-white/70">pagamento único</p>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-extrabold text-white">
              {formattedPrice}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
