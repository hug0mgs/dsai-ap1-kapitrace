import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "KapiTrace — Threat Intelligence & IP Reputation",
  description:
    "Plataforma de inteligência de ameaças e verificação de reputação de IPs, domínios, hashes e emails. Score de reputação unificado com dashboards analíticos.",
  keywords: [
    "threat intelligence",
    "IP reputation",
    "cybersecurity",
    "malware analysis",
    "domain reputation",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
