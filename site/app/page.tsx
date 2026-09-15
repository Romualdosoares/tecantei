import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Gift, Heart, LockKeyhole, Music2, Sparkles, Star } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { StorefrontPriceText } from "@/components/storefront-price-text";
import { ShowcaseAudioPlayer } from "@/components/showcase/showcase-audio-player";
import { FloatingWhatsAppButton, WHATSAPP_URL, WhatsAppIcon } from "@/components/whatsapp-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const testimonials = [
  ["Quando a música falou o apelido que só nós usamos, meu marido começou a chorar. Foi inesquecível.", "Mariana & Thiago", "Presente de bodas"],
  ["Minha mãe se emocionou com as lembranças da nossa família. Hoje ela ouve a música quase todos os dias.", "Rodrigo Mendonça", "Aniversário da mãe"],
  ["Poder editar a letra antes fez toda a diferença. Coloquei nossa gíria e a música ficou com a nossa cara.", "Beatriz Silveira", "Presente romântico"],
];

const faqs = [
  ["Quanto tempo demora para a música ficar pronta?", "Assim que você aprova a letra da sua história, a melodia e os vocais são criados e ficam prontos em cerca de 2 a 5 minutos, diretamente na sua tela."],
  ["Posso ouvir a música antes de pagar?", "Sim! Você ouve uma prévia de 50 segundos em alta qualidade antes de decidir pela compra. E ainda tem direito a 1 ajuste gratuito de estilo ou ritmo se quiser experimentar outra versão."],
  ["E se a letra não ficar do jeito que eu quero?", "Antes de qualquer música ser gerada, você recebe a letra completa na tela e pode editar cada verso, trocar palavras e adicionar nomes quantas vezes quiser, sem custo algum."],
  ["Como a pessoa presenteada vai ouvir a música?", "Você recebe o arquivo MP3 em alta fidelidade e também uma página de presente exclusiva, com dedicatória e player elegante, que pode enviar por WhatsApp ou QR Code."],
  ["A história que eu contar fica em segredo?", "Sim, com total privacidade e sigilo. O texto da sua história nunca é compartilhado publicamente. Na página de presente aparecem apenas a música final e a sua dedicatória."],
  ["Existe alguma assinatura ou mensalidade?", "Não! O valor é um pagamento único por pedido. Não há mensalidades, cobranças recorrentes nem taxas ocultas."],
];

const createLinkClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#D4AF55] px-6 py-3 text-sm font-extrabold text-[#090807] ring-1 ring-[#F5D77E]/60 transition hover:-translate-y-0.5 hover:bg-[#F5D77E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5D77E]";

type ShowcaseItem = {
  orderId: string;
  recipientName: string;
  occasion: string;
  style: string;
  title: string;
  durationSeconds: number | null;
};

async function getHomeShowcase(): Promise<ShowcaseItem[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from("home_showcase")
      .select("order_id, version_id, position")
      .order("position", { ascending: true })
      .limit(6);
    if (error || !rows || rows.length === 0) return [];

    const [{ data: orders }, { data: versions }] = await Promise.all([
      admin.from("orders").select("id, recipient_name, occasion, style").in("id", rows.map((row) => row.order_id)),
      admin.from("music_versions").select("id, title, duration_seconds").in("id", rows.map((row) => row.version_id)),
    ]);
    const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
    const versionById = new Map((versions ?? []).map((version) => [version.id, version]));

    return rows.flatMap((row) => {
      const order = orderById.get(row.order_id);
      const version = versionById.get(row.version_id);
      if (!order || !version) return [];
      return [{
        orderId: row.order_id,
        recipientName: order.recipient_name,
        occasion: order.occasion,
        style: order.style,
        title: version.title?.trim() || "Música personalizada",
        durationSeconds: version.duration_seconds,
      }];
    });
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const showcase = await getHomeShowcase();
  return (
    <main id="conteudo-principal" tabIndex={-1} className="min-h-screen overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
      <header className="sticky top-0 z-50 border-b border-[#D4AF55]/20 bg-[#090807]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-2 px-3 sm:h-20 sm:px-8">
          <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2.5" aria-label="Te Cantei — sua história virou música — página inicial">
            <BrandLogo compact priority />
            <span className="hidden sm:block"><strong className="block font-display text-2xl text-white">Te Cantei</strong><span className="block text-[.65rem] font-bold uppercase tracking-wider text-[#D4AF55]">Sua história virou música</span></span>
          </Link>
          <p className="hidden text-sm font-semibold text-[#B8AE99] lg:block">Ouça 50 segundos antes de decidir · Pagamento único</p>
          <nav aria-label="Ações principais" className="flex items-center gap-2">
            <Link href="/entrar" prefetch={false} className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold text-[#F5D77E] ring-1 ring-[#D4AF55]/30 sm:text-sm">Entrar</Link>
            <Link href="/criar" prefetch={false} className={`${createLinkClass} min-h-11 px-4 py-2`}><Sparkles className="size-4" /><span className="sm:hidden">Criar música</span><span className="hidden sm:inline">Criar minha música</span></Link>
          </nav>
        </div>
      </header>

      <section className="relative px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div aria-hidden="true" className="absolute inset-x-6 top-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-[#D4AF55] to-transparent" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <p className="inline-flex rounded-full border border-[#D4AF55]/30 bg-[#1A1813] px-4 py-2 text-xs font-bold text-[#F5D77E] sm:text-sm">Um presente único, criado com a história de vocês</p>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl">Transforme o que vocês viveram em uma canção para guardar para sempre.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#D8D0C1] sm:text-lg">Nomes, lugares, apelidos, conquistas e lembranças que só vocês entendem viram uma música exclusiva para emocionar quem você ama — hoje e toda vez que ela tocar.</p>
            <div className="mt-6 max-w-2xl border-l-2 border-[#D4AF55] bg-[#1A1813] px-5 py-4">
              <p className="font-display text-xl font-bold text-white">Não é apenas uma música.</p>
              <p className="mt-1 text-sm leading-7 text-[#B8AE99]">É uma forma de dizer aquilo que o coração sente e, às vezes, as palavras não conseguem explicar.</p>
            </div>
            <Link href="/criar" prefetch={false} className={`${createLinkClass} mt-8 min-h-14 px-8 text-base`}><Heart className="size-5 fill-current" />Criar uma música para quem eu amo<ArrowRight className="size-5" /></Link>
            <p className="mt-3 text-sm font-bold text-[#F5D77E]">Comece agora e ouça 50 segundos antes de decidir pela compra.</p>
            <ul className="mt-7 grid gap-3 text-sm font-semibold text-[#E8E2D6] sm:grid-cols-3">
              {["Você aprova cada verso", "1 ajuste incluído", "Sem assinatura"].map((item) => <li key={item} className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full border border-[#D4AF55]/40 text-[#D4AF55]"><Check className="size-3.5" /></span>{item}</li>)}
            </ul>
          </div>

          <aside className="tc-premium-frame mx-auto w-full max-w-md rounded-[30px] border border-[#D4AF55]/25 bg-[#1A1813] p-6 sm:p-8" aria-label="Resumo da oferta">
            <div className="flex items-center justify-between"><span className="rounded-full border border-[#D4AF55]/25 px-3 py-1 text-xs font-bold text-[#D4AF55]">CANÇÃO EXCLUSIVA</span><Music2 className="size-6 text-[#D4AF55]" /></div>
            <div className="my-8 grid aspect-[1.2] place-items-center border-y border-[#D4AF55]/20 bg-[radial-gradient(circle_at_center,#2b2415_0,#11100d_60%,#090807_100%)]">
              <div className="grid size-32 place-items-center rounded-full border border-[#F5D77E]/35 bg-[#090807] text-[#F5D77E] sm:size-40"><Heart className="size-14 fill-[#D4AF55]/15" /></div>
            </div>
            <p className="text-sm font-bold text-[#B8AE99]">Música completa + página para presentear</p>
            <p className="mt-2 font-display text-5xl font-extrabold text-white"><StorefrontPriceText /></p>
            <p className="mt-2 text-xs text-[#B8AE99]">Pagamento único · sem mensalidade</p>
            <Link href="/criar" prefetch={false} className={`${createLinkClass} mt-6 w-full`}>Criar minha música agora<ArrowRight className="size-4" /></Link>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#D8D0C1]"><LockKeyhole className="size-4 text-[#D4AF55]" />Você ouve a prévia antes de comprar.</p>
          </aside>
        </div>
      </section>

      <section className="tc-deferred-section border-y border-[#D4AF55]/15 bg-[#11100D] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl"><p className="text-center text-xs font-extrabold uppercase tracking-[.2em] text-[#D4AF55]">Do sentimento ao presente</p><ol className="mt-7 grid gap-3 sm:grid-cols-4">{["Conte a história", "Revise a letra", "Ouça 50 segundos", "Receba e compartilhe"].map((label, index) => <li key={label} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#D4AF55]/20 bg-[#1A1813] px-4"><span className="grid size-9 place-items-center rounded-full bg-[#D4AF55] text-sm font-extrabold text-[#090807]">{index + 1}</span><span className="text-sm font-bold text-white">{label}</span></li>)}</ol></div>
      </section>

      <section className="tc-deferred-section px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center"><div role="img" aria-label="Avaliações com cinco estrelas" className="flex justify-center gap-1 text-[#D4AF55]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-5 fill-current" />)}</div><p className="mt-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#D4AF55]">Histórias que viraram emoção</p><h2 className="mt-4 font-display text-3xl font-extrabold text-white sm:text-5xl">Um presente que a pessoa amada pode ouvir de novo — e sentir tudo outra vez.</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{testimonials.map(([quote, name, context]) => <figure key={name} className="rounded-[26px] border border-[#D4AF55]/20 bg-[#1A1813] p-6"><div role="img" aria-label="Cinco estrelas" className="flex gap-1 text-[#D4AF55]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-4 fill-current" />)}</div><blockquote className="mt-5 leading-7 text-[#E8E2D6]">“{quote}”</blockquote><figcaption className="mt-6 border-t border-[#D4AF55]/15 pt-4"><strong className="text-sm text-white">{name}</strong><span className="mt-1 block text-xs text-[#B8AE99]">{context}</span></figcaption></figure>)}</div>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="tc-deferred-section border-y border-[#D4AF55]/15 bg-[#11100D] px-4 py-16 sm:px-8" aria-labelledby="musicas-criadas">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#D4AF55]">Músicas criadas</p>
              <h2 id="musicas-criadas" className="mt-4 font-display text-3xl font-extrabold text-white sm:text-5xl">Histórias reais que já viraram canção.</h2>
              <p className="mt-4 text-sm leading-7 text-[#B8AE99] sm:text-base">Aperte o play e sinta como uma história de verdade emociona quando vira música.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((item) => (
                <article key={item.orderId} className="tc-premium-frame flex flex-col rounded-[26px] border border-[#D4AF55]/20 bg-[#1A1813] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-[#D4AF55]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D4AF55]">{item.style}</span>
                    <Music2 className="size-4 shrink-0 text-[#D4AF55]" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold leading-snug text-white">“{item.title}”</h3>
                  <p className="mt-2 text-sm font-semibold text-[#B8AE99]">Para {item.recipientName} · {item.occasion}</p>
                  <div className="mt-5 pt-1">
                    <ShowcaseAudioPlayer src={`/api/showcase/${item.orderId}/audio`} title={item.title} durationSeconds={item.durationSeconds} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="tc-deferred-section px-4 py-16 sm:px-8" aria-labelledby="duvidas-frequentes">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#D4AF55]">Dúvidas frequentes</p>
            <h2 id="duvidas-frequentes" className="mt-4 font-display text-3xl font-extrabold text-white sm:text-5xl">Tudo o que você precisa saber antes de criar.</h2>
            <p className="mt-4 text-sm leading-7 text-[#B8AE99] sm:text-base">Respostas diretas para você criar a sua música com total confiança.</p>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-[#D4AF55]/20 bg-[#1A1813] transition open:border-[#D4AF55]/40">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-display text-base font-bold text-white marker:hidden [&::-webkit-details-marker]:hidden sm:text-lg">
                  {question}
                  <ChevronDown className="size-5 shrink-0 text-[#D4AF55] transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="border-t border-[#D4AF55]/15 px-5 pb-5 pt-4 text-sm leading-7 text-[#D8D0C1]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="tc-deferred-section px-4 pb-20 sm:px-8">
        <div className="tc-premium-frame mx-auto grid max-w-6xl gap-8 rounded-[34px] border border-[#D4AF55]/30 bg-[#1A1813] p-7 sm:p-11 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4AF55]"><Gift className="size-4" />Uma lembrança que não expira</p><h2 className="mt-5 font-display text-3xl font-extrabold text-white sm:text-5xl">O momento passa. A canção fica.</h2><p className="mt-4 max-w-2xl leading-8 text-[#D8D0C1]">Registre essas lembranças enquanto ainda estão vivas e transforme-as em algo que poderá atravessar anos. Imagine a reação de quem você ama ao perceber que a música conta exatamente a história de vocês.</p></div>
          <div className="border border-[#D4AF55]/20 bg-[#090807] p-6 text-center"><p className="text-sm font-bold text-[#F5D77E]">Música completa + página para presentear</p><p className="mt-2 font-display text-4xl font-extrabold text-white"><StorefrontPriceText /></p><Link href="/criar" prefetch={false} className={`${createLinkClass} mt-6 w-full`}>Criar minha música agora<ArrowRight className="size-4" /></Link><p className="mt-5 text-xs font-semibold text-[#B8AE99]">Ficou com alguma dúvida? Fale com a gente:</p><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-extrabold text-[#062b16] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#3ee07a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366]"><WhatsAppIcon className="size-5" />Tirar dúvidas no WhatsApp</a><p className="mt-2 text-xs text-[#B8AE99]">(43) 9145-6410</p></div>
        </div>
      </section>

      <footer className="border-t border-[#D4AF55]/15 px-4 py-8 text-center text-xs text-[#B8AE99]">© {new Date().getFullYear()} Te Cantei · Histórias transformadas em música com carinho e privacidade.</footer>

      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden"><Link href="/criar" prefetch={false} className={`${createLinkClass} w-full`}><Heart className="size-4 fill-current" />Criar minha música<ArrowRight className="size-4" /></Link></div>

      <FloatingWhatsAppButton />
    </main>
  );
}
