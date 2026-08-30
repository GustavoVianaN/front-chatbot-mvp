'use client';

import { useEffect, useState } from 'react';
import {
  cancelSubscription,
  exportAccountData,
  getAccountOverview,
  getPlans,
  inviteTeamMember,
  requestAccountDeletion,
  selectAccountPlan,
} from '@/lib/api';
import type { AccountOverview, PlanCatalogItem } from '@/lib/types';

const METRIC_LABELS: Record<string, string> = {
  messages: 'Mensagens',
  aiTokens: 'Processamento de IA',
  audioMinutes: 'Áudio (minutos)',
  storageMb: 'Armazenamento (MB)',
  contacts: 'Contatos',
};

function formatBrl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AccountPage() {
  const [data, setData] = useState<AccountOverview | null>(null);
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const load = () => {
    void getPlans().then(setPlans).catch(() => undefined);
    return getAccountOverview()
      .then(setData)
      .catch((e) => setNotice(e instanceof Error ? e.message : 'Não foi possível carregar.'));
  };

  useEffect(() => {
    void load();
  }, []);

  async function plan(value: 'STARTER' | 'PRO' | 'BUSINESS') {
    await selectAccountPlan(value);
    setNotice('Solicitação registrada. Veja abaixo como concluir o pagamento.');
    await load();
  }

  async function invite() {
    try {
      const r = await inviteTeamMember(name, email);
      setNotice(`Convite criado. Link de primeiro acesso: ${r.setupLink}`);
      setName('');
      setEmail('');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Não foi possível convidar.');
    }
  }

  async function exportData() {
    const payload = await exportAccountData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bella-dados.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    const confirmation = window.prompt('Digite EXCLUIR MINHA CONTA para confirmar.');
    if (!confirmation) return;
    await requestAccountDeletion(confirmation);
    window.location.href = '/login';
  }

  if (!data) return <main className="min-h-screen bg-slate-950 p-8 text-white">Carregando conta...</main>;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-sm text-slate-400">← Voltar ao painel</a>
        <h1 className="mt-5 text-3xl font-semibold">Conta e plano</h1>

        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">{notice}</div>
        )}

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-slate-400">Plano atual</p>
              <h2 className="mt-1 text-2xl font-semibold">{data.company.plan}</h2>
            </div>
            <span className="text-sm text-emerald-300">{data.company.subscriptionStatus}</span>
          </div>

          {data.usage.paymentInstructions && (
            <div className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-semibold">Falta concluir o pagamento</p>
              <p className="mt-2 leading-6">{data.usage.paymentInstructions}</p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <button
                key={p.plan}
                type="button"
                onClick={() => void plan(p.plan)}
                disabled={data.company.plan === p.plan && data.company.subscriptionStatus === 'ACTIVE'}
                className={`rounded-2xl border p-5 text-left transition ${
                  data.company.plan === p.plan
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-emerald-500'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <strong className="text-lg">{p.label}</strong>
                <p className="mt-1 text-xs leading-5 text-slate-400">{p.tagline}</p>
                <p className="mt-3 text-2xl font-semibold">
                  {formatBrl(p.monthlyPriceBrl)}
                  <span className="text-sm font-normal text-slate-400">/mês</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">+ {formatBrl(p.setupFeeBrl)} de implantação (única vez)</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                  {p.highlights.map((h) => <li key={h}>• {h}</li>)}
                </ul>
                <p className="mt-4 text-xs font-semibold text-emerald-300">
                  {data.company.plan === p.plan && data.company.subscriptionStatus === 'ACTIVE' ? 'Plano atual' : 'Selecionar este plano'}
                </p>
              </button>
            ))}
          </div>

          <p className="mt-5 text-xs text-amber-200">
            Valores de rascunho, sujeitos a ajuste. A cobrança automática ainda depende da
            conexão de um provedor de pagamento — até lá, a ativação é confirmada manualmente
            pela nossa equipe após o pagamento.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Uso do mês</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries(data.usage.metrics).map(([key, v]) => (
              <div key={key}>
                <div className="flex justify-between text-sm">
                  <span>{METRIC_LABELS[key] || key}</span>
                  <span>{v.used} / {v.limit}</span>
                </div>
                <div className="mt-2 h-2 rounded bg-slate-800">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, v.limit ? (v.used / v.limit) * 100 : 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Equipe ({data.company.users.length}/{data.company.teamMemberLimit})</h2>
          <div className="mt-4 space-y-2">
            {data.company.users.map((u) => (
              <div key={u.id} className="rounded-xl bg-slate-950 p-3 text-sm">{u.name} · {u.email}</div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 p-3" />
            <input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 p-3" />
            <button onClick={() => void invite()} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold">Convidar</button>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Privacidade e assinatura</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => void exportData()} className="rounded-xl border border-slate-700 px-4 py-3">Exportar meus dados</button>
            <button
              onClick={async () => {
                await cancelSubscription();
                setNotice('Assinatura cancelada.');
                await load();
              }}
              className="rounded-xl border border-amber-600/50 px-4 py-3 text-amber-200"
            >
              Cancelar assinatura
            </button>
            <button onClick={() => void remove()} className="rounded-xl border border-rose-600/50 px-4 py-3 text-rose-200">Excluir conta</button>
          </div>
        </section>
      </div>
    </main>
  );
}
