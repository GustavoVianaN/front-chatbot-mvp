'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Sparkles, TestTube2 } from 'lucide-react';
import type { BotConfig } from '@/lib/types';
import { generateBotTestResponse } from '@/lib/api';

type BotConfigPanelProps = {
  botConfig: BotConfig;
  onSave: (data: BotConfig) => Promise<void>;
  focusTest?: boolean;
  onTestFocused?: () => void;
};

export default function BotConfigPanel({ botConfig, onSave, focusTest, onTestFocused }: BotConfigPanelProps) {
  const [form, setForm] = useState<BotConfig>(botConfig);
  const [testMessage, setTestMessage] = useState('Olá, preciso de ajuda com horários.');
  const [testResponse, setTestResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const testRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: keyof BotConfig, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (!focusTest) return;

    testRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onTestFocused?.();
  }, [focusTest, onTestFocused]);

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
            Usar apenas base de conhecimento
          </label>
        </div>
      </div>

      <div ref={testRef} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Simulação</p>
        <p className="mt-3 text-sm text-slate-400">Envie um teste rápido para ver como o bot responde.</p>
        <textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} rows={4} className="mt-4 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
        <button type="button" onClick={async () => {
          setTestResponse('Gerando resposta...');
          try {
            setTestResponse(await generateBotTestResponse(form, testMessage));
          } catch (error) {
            setTestResponse(error instanceof Error ? error.message : 'Não foi possível gerar a resposta.');
          }
        }} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white transition hover:bg-slate-700">
          <TestTube2 size={16} /> Gerar resposta
        </button>
        {testResponse && (
          <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Resposta do bot</p>
            <p className="mt-3 whitespace-pre-line leading-6">{testResponse}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300 sm:rounded-3xl sm:p-6">
        <p className="font-semibold text-white">Nota</p>
        <p className="mt-2 leading-6">Segredos como OPENAI_API_KEY, WHATSAPP_TOKEN e APP_SECRET não aparecem aqui. Estas informações ficam com o administrador.</p>
      </div>
    </div>
  );
}
