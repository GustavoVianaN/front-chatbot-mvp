'use client';

import { Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import type { WhatsAppStatus } from '@/lib/types';

type WhatsAppStatusPanelProps = {
  status: WhatsAppStatus;
};

export default function WhatsAppStatusPanel({ status }: WhatsAppStatusPanelProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Integração WhatsApp</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Status de conexão</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <ShieldCheck size={16} /> Produção
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: 'Número conectado', value: status.number },
            { label: 'Phone Number ID', value: status.phoneNumberId },
            { label: 'Webhook', value: status.webhookStatus },
            { label: 'Último evento', value: status.lastEvent },
            { label: 'Última mensagem', value: status.lastMessage },
            { label: 'Token configurado', value: status.tokenConfigured ? 'Sim' : 'Não' },
            { label: 'Assinatura Meta', value: status.metaSubscription },
            { label: 'Ambiente', value: status.environment },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 sm:rounded-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-3 break-words text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white transition hover:bg-slate-700">
            <Copy size={16} /> Copiar URL do webhook
          </button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 transition hover:border-slate-500">
            <RefreshCw size={16} /> Recarregar configuração
          </button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 transition hover:border-slate-500">
            Verificar status
          </button>
        </div>
      </div>
    </div>
  );
}
