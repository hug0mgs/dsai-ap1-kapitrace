import type { Metadata } from "next";
import type { ReactNode } from 'react';
import './globals.css';

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" >
      <body>{children}</body>
    </html>
  );
}
