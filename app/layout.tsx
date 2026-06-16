import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clínica Bella | Painel de Atendimento',
  description: 'Painel operacional de atendimento IA para WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
