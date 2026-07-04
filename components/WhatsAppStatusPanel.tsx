'use client';

import { useState } from 'react';
import { Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import type { WhatsAppDisconnectEvent, WhatsAppStatus } from '@/lib/types';
import { testWhatsappWebMessage } from '@/lib/api';
import { toast } from '@/components/Toast';

type WhatsAppStatusPanelProps = {
  status: WhatsAppStatus;
  disconnectEvents?: WhatsAppDisconnectEvent[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onStartWeb: () => Promise<void>;
  onDisconnectWeb: () => Promise<void>;
};

const webStatusLabel = {
  disconnected: 'Desconectado',
  connecting: 'Conectando',
  qr_pending: 'Aguardando QR Code',
  connected: 'Conectado',
} as const;

export default function WhatsAppStatusPanel({ status, disconnectEvents = [], loading = false, onRefresh, onStartWeb, onDisconnectWeb }: WhatsAppStatusPanelProps) {
  const webConnected = status.web.status === 'connected';
  const webWaitingQr = status.web.status === 'qr_pending' && status.web.qrCode;
  const canStartWeb = status.web.status === 'disconnected';
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Teste de conexão via WhatsApp Web.');
  const [sendingTest, setSendingTest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [startingWeb, setStartingWeb] = useState(false);

  const handleRefresh = async (message: string) => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      await onRefresh();
      toast(message);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível atualizar o status.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim() || sendingTest) return;

    setSendingTest(true);
    try {
      await testWhatsappWebMessage(testPhone, testMessage);
      toast('Mensagem de teste enviada pelo WhatsApp Web.');
      setTestMessage('Teste de conexão via WhatsApp Web.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem de teste.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleStartWeb = async () => {
    if (startingWeb || loading) return;

    setStartingWeb(true);
    try {
      await onStartWeb();
    } finally {
      setStartingWeb(false);
    }
  };

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

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">API oficial Meta</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{status.connected ? 'Conectada' : 'Não conectada'}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.connected ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                {status.webhookStatus}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Número conectado', value: status.number },
                { label: 'Phone Number ID', value: status.phoneNumberId },
                { label: 'Token configurado', value: status.tokenConfigured ? 'Sim' : 'Não' },
                { label: 'Assinatura Meta', value: status.metaSubscription },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-3 break-words text-sm font-semibold text-white">{item.value || 'Não configurado'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">WhatsApp Web</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{webStatusLabel[status.web.status] || 'Desconectado'}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {webConnected
                    ? `Número conectado: ${status.web.phoneNumber || 'WhatsApp Web'}`
                    : 'Escaneie o QR Code no celular do cliente para ativar esse canal.'}
                </p>
                {status.web.warning && (
                  <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium leading-5 text-amber-200">{status.web.warning}</p>
                )}
                <p className="mt-2 text-xs leading-5 text-slate-500">Atraso entre envios: {Math.round(status.web.sendDelayMs / 100) / 10}s a {Math.round((status.web.maxSendDelayMs || status.web.sendDelayMs) / 100) / 10}s, com indicador de digitando.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${webConnected ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                {webConnected ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {webWaitingQr && (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border border-slate-800 bg-white p-4">
                <img src={status.web.qrCode} alt="QR Code do WhatsApp Web" className="h-64 w-64 max-w-full" />
                <p className="text-center text-sm font-medium text-slate-900">Abra o WhatsApp no celular, toque em aparelhos conectados e escaneie este QR Code.</p>
              </div>
            )}

            {status.web.lastError && (
              <p className="mt-4 rounded-2xl border border-rose-600/30 bg-rose-600/10 p-3 text-sm text-rose-200">{status.web.lastError}</p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {canStartWeb && (
                <button type="button" onClick={handleStartWeb} disabled={loading || startingWeb} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                  <RefreshCw size={16} className={startingWeb ? 'animate-spin' : ''} /> {startingWeb ? 'Gerando QR Code...' : 'Conectar via QR Code'}
                </button>
              )}
              {!canStartWeb && !webConnected && (
                <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium leading-6 text-amber-200">
                  Para gerar um novo QR Code, desconecte a sessão atual primeiro.
                </p>
              )}
              <button type="button" onClick={onDisconnectWeb} disabled={loading || status.web.status === 'disconnected'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500">
                Desconectar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-white">Teste de envio pelo WhatsApp Web</p>
              <div className="mt-4 grid gap-3">
                <label className="space-y-2 text-sm text-slate-300">
                  Telefone com DDI e DDD
                  <input value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="5511999999999" className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  Mensagem
                  <textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
                </label>
                <button type="button" onClick={handleSendTest} disabled={!webConnected || !testPhone.trim() || !testMessage.trim() || sendingTest} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto">
                  Enviar teste
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-white">Histórico de desconexões</p>
              <div className="mt-3 grid gap-2">
                {disconnectEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma queda registrada ainda.</p>
                ) : disconnectEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
                    <p className="font-medium text-white">{new Date(event.occurred_at).toLocaleString('pt-BR')}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.reason || 'Sessão encerrada'}{event.status_code ? ` · código ${event.status_code}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white transition hover:bg-slate-700">
            <Copy size={16} /> Copiar URL do webhook
          </button>
          <button type="button" onClick={() => void handleRefresh('Configuração recarregada.')} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500">
            <RefreshCw size={16} /> {refreshing ? 'Atualizando...' : 'Recarregar configuração'}
          </button>
          <button type="button" onClick={() => void handleRefresh('Status verificado.')} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500">
            Verificar status
          </button>
        </div>
      </div>
    </div>
  );
}
