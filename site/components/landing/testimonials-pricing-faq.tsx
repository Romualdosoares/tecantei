"use client";

import { useState } from "react";
import { Star, Check, ChevronDown, Lock, Heart, Gift, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStorefrontPrice } from "@/components/storefront-price-provider";

const testimonials = [
  {
    name: "Mariana & Thiago",
    city: "São Paulo, SP",
    occasion: "Bodas de Madeira (5 anos)",
    quote:
      "Eu fiz de surpresa no nosso jantar. Quando começou a tocar e o cantor falou o apelido que só nós dois usamos, meu marido começou a chorar na hora. Foi o presente mais especial da nossa vida!",
    rating: 5,
    style: "MPB Romântico",
  },
  {
    name: "Rodrigo Mendonça",
    city: "Belo Horizonte, MG",
    occasion: "Aniversário da Mãe (60 anos)",
    quote:
      "Minha mãe sempre amou sertanejo acústico. Coloquei as histórias da infância na roça e as frases que ela sempre diz. Ela ouve todo dia de manhã. Valeu cada centavo, parabéns!",
    rating: 5,
    style: "Sertanejo Acústico",
  },
  {
    name: "Beatriz Silveira",
    city: "Curitiba, PR",
    occasion: "Pedido de Namoro",
    quote:
      "O que mais gostei foi poder ler a letra antes de autorizar a música. Mudei duas palavras para ficar com a nossa gíria e ficou surreal de lindo. Super recomendo!",
    rating: 5,
    style: "Pop Acústico",
  },
];

const faqs = [
  {
    q: "Quanto tempo demora para a música ficar pronta?",
    a: "Assim que você aprova a letra da sua história, a melodia e os vocais são criados e disponibilizados em cerca de 2 a 5 minutos diretamente na sua tela.",
  },
  {
    q: "Eu posso ouvir a música antes de pagar?",
    a: "Sim! Você ouve uma prévia de 50 segundos em alta qualidade. Além disso, tem direito a 1 ajuste gratuito de estilo ou ritmo se quiser experimentar outra versão antes de concluir o pedido.",
  },
  {
    q: "E se a letra não ficar exatamente do jeito que eu quero?",
    a: "Antes de qualquer música ser gerada, você recebe a letra completa em texto na tela. Você pode editar diretamente cada frase, trocar palavras, adicionar nomes ou pedir novas ideias quantas vezes quiser sem custo.",
  },
  {
    q: "Como a pessoa presenteada vai ouvir a música?",
    a: "Você recebe o arquivo MP3 para download em alta fidelidade e também uma Página Web de Presente exclusiva, com dedicatória e player elegante que você pode enviar por WhatsApp ou QR Code.",
  },
  {
    q: "A história que eu contar fica em segredo?",
    a: "Sim, com total privacidade e sigilo. O texto da sua história nunca é compartilhado publicamente. Na página de presente compartilhada com quem recebe, aparece apenas a música final e a sua dedicatória carinhosa.",
  },
  {
    q: "Existe alguma assinatura ou mensalidade?",
    a: "Não! O valor de R$ 19,90 é pagamento único por pedido. Não há mensalidades, cobranças recorrentes nem taxas ocultas.",
  },
];

export function TestimonialsPricingFaq({ onStart }: { onStart?: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { formattedPrice } = useStorefrontPrice();

  return (
    <div className="space-y-24 my-20">
      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <Badge className="rounded-full bg-rose-100 text-rose-900 border-0 px-3.5 py-1 text-xs font-semibold">
            <Heart className="size-3.5 fill-rose-500 text-rose-500 mr-1.5" />
            HISTÓRIAS REAIS
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-[#2b1722]">
            Lágrimas de alegria em cada presente entregue
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Mais de 1.200 canções encomendadas para aniversários, casamentos, homenagens e datas inesquecíveis.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="tc-premium-frame flex flex-col justify-between rounded-[28px] border border-rose-200/70 bg-white/90 p-7 shadow-sm transition hover:shadow-lg backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-400" />
                    ))}
                  </div>
                  <Badge variant="outline" className="text-xs text-rose-800 border-rose-200 bg-rose-50/50">
                    {t.style}
                  </Badge>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-[#3a1a29] italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-rose-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#2b1722]">{t.name}</h4>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
                <span className="text-[0.75rem] font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                  {t.occasion}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transparent Pricing Card */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="tc-premium-frame relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#3b1228] via-[#541639] to-[#250a18] p-8 sm:p-12 text-white shadow-2xl shadow-rose-950/20">
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-rose-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-rose-200 backdrop-blur-md">
                <Sparkles className="size-3.5 text-rose-300" />
                <span>PREÇO JUSTO E TRANSPARENTE</span>
              </div>

              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl text-white">
                Sua música completa por um valor acessível.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed">
                Tudo o que você precisa para emocionar alguém especial hoje mesmo. Sem assinaturas, sem surpresas no checkout.
              </p>

              <ul className="mt-7 space-y-3.5 text-sm text-white/90">
                {[
                  "Letra 100% personalizada escrita com a sua história",
                  "Revisão e edição livre da letra antes da gravação",
                  "Prévia de 50 segundos para você ouvir",
                  "1 ajuste de estilo/ritmo gratuito incluído",
                  "Download do arquivo MP3 em alta fidelidade",
                  "Página web de presente com dedicatória e player",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose-400/20 text-rose-200">
                      <Check className="size-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Box */}
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-7 sm:p-8 text-center backdrop-blur-xl">
              <span className="text-xs uppercase tracking-widest text-rose-200 font-bold">
                Valor do Pedido
              </span>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="font-display text-5xl font-extrabold text-white">{formattedPrice}</span>
              </div>
              <p className="mt-1 text-xs text-white/70">Pagamento único via Pix ou Cartão</p>

              <div className="mt-6">
                <Button
                  size="lg"
                  onClick={onStart}
                  className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-base hover:bg-[#FFE49A] shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-98 transition"
                >
                  <Gift className="size-5 mr-2 text-rose-700" />
                  Criar Minha Música Agora
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/60">
                <Lock className="size-3.5" />
                <span>Garantia de aprovação da letra</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <Badge className="rounded-full bg-rose-100 text-rose-900 border-0 px-3.5 py-1 text-xs font-semibold">
            DÚVIDAS FREQUENTES
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#2b1722]">
            Tudo o que você precisa saber
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground text-sm sm:text-base">
            Respostas diretas para você criar a sua música com total confiança e segurança.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-rose-200/70 bg-white/80 transition shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-display text-lg font-semibold text-[#2b1722] hover:text-rose-900 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`size-5 text-rose-700 transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-muted-foreground border-t border-rose-50">
                      {faq.a.replace("R$ 19,90", formattedPrice)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
