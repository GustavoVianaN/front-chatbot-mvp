'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, RotateCcw, Send, TestTube2 } from 'lucide-react';
import type { BotConfig, SimulationLog } from '@/lib/types';
import { generateBotTestResponse, getSimulationLogs } from '@/lib/api';

type BotConfigPanelProps = {
  botConfig: BotConfig;
  onSave: (data: BotConfig) => Promise<void>;
  onRefresh: () => Promise<BotConfig>;
  mode?: 'simulation' | 'config';
};

type TestMessage = {
  id: string;
  role: 'customer' | 'bot';
  text: string;
};

function formatConversationContext(messages: TestMessage[]) {
  return messages
    .map((message) => `${message.role === 'customer' ? 'Cliente' : 'Bot'}: ${message.text}`)
    .join('\n');
}

function newSimulationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2, 14)}`.padEnd(36, '0');
}

export default function BotConfigPanel({ botConfig, onSave, onRefresh, mode = 'config' }: BotConfigPanelProps) {
  const [form, setForm] = useState<BotConfig>(botConfig);
  const [testMessage, setTestMessage] = useState('');
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [simulationId, setSimulationId] = useState(() => newSimulationId());
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([]);
  const [testing, setTesting] = useState(false);
  const [refreshingSimulation, setRefreshingSimulation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(botConfig);
  }, [botConfig]);

  useEffect(() => {
    if (mode !== 'simulation') return;

    getSimulationLogs()
      .then(setSimulationLogs)
      .catch(() => undefined);
  }, [mode]);

  const handleChange = (field: keyof BotConfig, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetSimulation = async () => {
    setTestMessage('');
    setTestMessages([]);
    setSimulationId(newSimulationId());

    try {
      setRefreshingSimulation(true);
      const latestConfig = await onRefresh();
      setForm(latestConfig);
    } finally {
      setRefreshingSimulation(false);
    }
  };

  const sendTestMessage = async () => {
    const message = testMessage.trim();

    if (!message || testing) return;

    const customerMessage: TestMessage = {
      id: `customer-${Date.now()}`,
      role: 'customer',
      text: message,
    };
    const previousMessages = testMessages;

    setTestMessages((current) => [...current, customerMessage]);
    setTestMessage('');
    setTesting(true);

    try {
      const result = await generateBotTestResponse(form, message, formatConversationContext(previousMessages), simulationId);
      setSimulationId(result.simulationId);
      setTestMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: result.response,
        },
      ]);
      setSimulationLogs((current) => [result.log, ...current].slice(0, 100));
    } catch (error) {
      setTestMessages((current) => [
        ...current,
        {
          id: `bot-error-${Date.now()}`,
          role: 'bot',
          text: error instanceof Error ? error.message : 'Não foi possível gerar a resposta.',
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  if (mode === 'simulation') {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-panel sm:rounded-3xl">
          <div className="flex flex-col gap-4 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-300">
                <TestTube2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Simulação do bot</p>
                <p className="truncate text-xs text-slate-400">{form.assistant_name || 'Bot'} - conversa de teste do cliente</p>
              </div>
            </div>
            <button type="button" onClick={resetSimulation} disabled={refreshingSimulation} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              <RotateCcw size={16} />
              Nova conversa
            </button>
          </div>

          <div className="flex min-h-[520px] flex-col gap-3 overflow-y-auto bg-slate-950/70 p-4 sm:p-5">
            {testMessages.length === 0 ? (
              <div className="m-auto max-w-sm text-center text-sm leading-6 text-slate-400">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-emerald-300">
                  <MessageCircle size={20} />
                </div>
                <p className="mt-4 text-base font-medium text-white">Nova conversa iniciada</p>
                <p className="mt-2">{refreshingSimulation ? 'Recarregando configuração do banco...' : 'Digite como cliente para testar respostas, memória e comportamento do bot.'}</p>
              </div>
            ) : (
              testMessages.map((message) => {
                const isCustomer = message.role === 'customer';

                return (
                  <div key={message.id} className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${isCustomer ? 'self-end bg-emerald-600 text-white' : 'self-start bg-slate-800 text-slate-100'}`}>
                    <p className="whitespace-pre-line break-words">{message.text}</p>
                  </div>
                );
              })
            )}
            {testing && (
              <div className="max-w-[86%] self-start rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                Digitando...
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-900/90 p-3 sm:p-4">
            <div className="flex gap-2">
              <textarea
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendTestMessage();
                  }
                }}
                rows={2}
                placeholder="Digite como cliente..."
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500"
              />
              <button type="button" onClick={sendTestMessage} disabled={!testMessage.trim() || testing} className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700" aria-label="Enviar mensagem">
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300 sm:rounded-3xl sm:p-6">
          <p className="font-semibold text-white">Como testar</p>
          <p className="mt-2 leading-6">Use “Nova conversa” para simular outro usuário. A simulação recarrega a configuração atual do banco e mantém memória só dentro desta conversa de teste.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Histórico</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Simulações salvas</h2>
            </div>
            <button type="button" onClick={async () => setSimulationLogs(await getSimulationLogs())} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800 sm:w-auto">
              <RotateCcw size={16} />
              Atualizar histórico
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {simulationLogs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
                Nenhuma simulação salva ainda.
              </div>
            ) : (
              simulationLogs.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Conversa {log.simulation_id.slice(0, 8)} · Turno {log.turn_index}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{log.assistant_name || form.assistant_name}</span>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-emerald-600/10 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Cliente</p>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-100">{log.user_message}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-800 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bot</p>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-100">{log.bot_response}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Configurar Bot</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Assistente Bella</h2>
          </div>
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              await onSave(form);
              setSaving(false);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:w-auto"
          >
            <CheckCircle2 size={16} /> Salvar
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            Nome do assistente
            <input value={form.assistant_name} onChange={(event) => handleChange('assistant_name', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Nome da empresa
            <input value={form.company_name} onChange={(event) => handleChange('company_name', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Descrição da empresa
            <textarea value={form.company_description} onChange={(event) => handleChange('company_description', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Instruções principais
            <textarea value={form.instructions} onChange={(event) => handleChange('instructions', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Tom de voz
            <input value={form.tone} onChange={(event) => handleChange('tone', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Limite de resposta
            <select value={form.response_length} onChange={(event) => handleChange('response_length', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
              <option value="curta">Curta</option>
              <option value="média">Média</option>
              <option value="detalhada">Detalhada</option>
            </select>
          </label>
          <div className="lg:col-span-2">
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">Guardrails e Escopo</p>
          </div>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Escopo permitido
            <textarea value={form.business_scope} onChange={(event) => handleChange('business_scope', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Guardrails obrigatórios
            <textarea value={form.guardrails} onChange={(event) => handleChange('guardrails', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Assuntos bloqueados
            <textarea value={form.blocked_topics} onChange={(event) => handleChange('blocked_topics', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Quando encaminhar para humano
            <textarea value={form.handoff_triggers} onChange={(event) => handleChange('handoff_triggers', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Regras de resposta
            <textarea value={form.response_rules} onChange={(event) => handleChange('response_rules', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem de boas-vindas
            <textarea value={form.welcome_message} onChange={(event) => handleChange('welcome_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem de fallback
            <textarea value={form.fallback_message} onChange={(event) => handleChange('fallback_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem fora do horário
            <textarea value={form.out_of_hours_message} onChange={(event) => handleChange('out_of_hours_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.bot_enabled} onChange={(event) => handleChange('bot_enabled', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Bot ativo
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.allow_human_handoff} onChange={(event) => handleChange('allow_human_handoff', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Permitir encaminhar para humano
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.knowledge_only} onChange={(event) => handleChange('knowledge_only', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Responder apenas com informações dos arquivos
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.prompt_injection_protection} onChange={(event) => handleChange('prompt_injection_protection', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Bloquear prompt injection
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300 sm:rounded-3xl sm:p-6">
        <p className="font-semibold text-white">Nota</p>
        <p className="mt-2 leading-6">Segredos como OPENAI_API_KEY, WHATSAPP_TOKEN e APP_SECRET não aparecem aqui. Estas informações ficam com o administrador.</p>
      </div>
    </div>
  );
}
