import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";

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
  title: "Te Cantei — Sua história virou música",
  description: "Transforme momentos, memórias e sentimentos em uma música personalizada inesquecível. Ouça a prévia antes e presenteie quem você ama.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/te-cantei-logo.png",
    shortcut: "/te-cantei-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${playfair.variable} scroll-smooth`}>
      <body className="font-sans antialiased selection:bg-rose-500/20 selection:text-rose-900">
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
