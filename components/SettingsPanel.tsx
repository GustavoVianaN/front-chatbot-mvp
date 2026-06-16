'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/types';

type SettingsPanelProps = {
  settings: Settings;
  onSave: (data: Settings) => Promise<void>;
};

export default function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState<Settings>(settings);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Configurações gerais</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Dados da empresa</h2>
          </div>
          <button type="button" onClick={async () => await onSave(form)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:w-auto">
            Salvar alterações
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            Nome da empresa
            <input value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Email de contato
            <input value={form.contact_email} onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Telefone da empresa
            <input value={form.contact_phone} onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Fuso horário
            <input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Horário de atendimento
            <input value={form.business_hours} onChange={(event) => setForm((current) => ({ ...current, business_hours: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem fora do horário
            <textarea value={form.out_of_hours_message} onChange={(event) => setForm((current) => ({ ...current, out_of_hours_message: event.target.value }))} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Idioma padrão
            <select value={form.default_language} onChange={(event) => setForm((current) => ({ ...current, default_language: event.target.value as Settings['default_language'] }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
              <option value="Português">Português</option>
              <option value="Inglês">Inglês</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.email_notifications} onChange={(event) => setForm((current) => ({ ...current, email_notifications: event.target.checked }))} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Notificações por email
          </label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:rounded-3xl sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Segurança</p>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span>Status do rate limit</span>
              <span className="font-semibold text-white">{form.rate_limit_status}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span>Último deploy</span>
              <span className="font-semibold text-white">{form.last_deploy}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span>Ambiente atual</span>
              <span className="font-semibold text-white">{form.environment}</span>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-sm leading-6 text-slate-300">
              Segredos e credenciais são gerenciados pelo administrador do sistema. Não exibimos tokens no painel.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
