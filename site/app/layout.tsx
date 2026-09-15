import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { StorefrontPriceProvider } from "@/components/storefront-price-provider";

const siteUrl = new URL("https://tecantei.vercel.app");

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Te Cantei — Música personalizada para presentear",
    template: "%s — Te Cantei",
  },
  description: "Transforme nomes, memórias e sentimentos em uma música personalizada. Aprove a letra, ouça uma prévia de 50 segundos e presenteie quem você ama.",
  applicationName: "Te Cantei",
  keywords: ["música personalizada", "música de presente", "canção personalizada", "presente romântico", "música com história"],
  authors: [{ name: "Te Cantei", url: siteUrl }],
  creator: "Te Cantei",
  publisher: "Te Cantei",
  category: "presentes personalizados",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Te Cantei",
    title: "Te Cantei — Sua história virou música",
    description: "Uma canção exclusiva feita com os detalhes da sua história. Ouça 50 segundos antes de decidir.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Te Cantei — Sua história virou música" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Te Cantei — Sua história virou música",
    description: "Transforme uma história especial em uma canção exclusiva para presentear.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/tecantei-logodourada.jpg",
    shortcut: "/tecantei-logodourada.jpg",
    apple: "/tecantei-logodourada.jpg",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${playfair.variable} scroll-smooth`}>
      <body className="font-sans antialiased selection:bg-primary/30 selection:text-[#FFE49A]">
        <a className="tc-skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl}#organization`,
                  name: "Te Cantei",
                  url: siteUrl,
                  logo: new URL("/tecantei-logodourada.jpg", siteUrl),
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteUrl}#website`,
                  name: "Te Cantei",
                  url: siteUrl,
                  inLanguage: "pt-BR",
                  publisher: { "@id": `${siteUrl}#organization` },
                },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
        <StorefrontPriceProvider>
          <AnalyticsTracker />
          {children}
        </StorefrontPriceProvider>
      </body>
    </html>
  );
}
