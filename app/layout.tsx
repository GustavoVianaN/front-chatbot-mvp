import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'BellAI Connect',
  title: 'BellAI Connect | Atendimento com IA para WhatsApp',
  description: 'Automatize o atendimento no WhatsApp com a Bella. Responda dúvidas, qualifique clientes e organize pedidos com a BellAI Connect.',
  openGraph: {
    title: 'BellAI Connect | Atendimento com IA para WhatsApp',
    description: 'Automatize o atendimento no WhatsApp com a Bella. Responda dúvidas, qualifique clientes e organize pedidos com a BellAI Connect.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BellAI Connect | Atendimento com IA para WhatsApp',
    description: 'Automatize o atendimento no WhatsApp com a Bella. Responda dúvidas, qualifique clientes e organize pedidos com a BellAI Connect.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body>{children}</body>
    </html>
  );
}
