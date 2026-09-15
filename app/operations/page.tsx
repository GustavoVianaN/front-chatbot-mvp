import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, getOperations, getOperationsCompanies, getOperationsFailures, retryOperationsJob } from '@/lib/api';

async function retry(form: FormData) {
  'use server';
  const kind = form.get('kind');
  if (kind !== 'email' && kind !== 'webhook') return;
  await retryOperationsJob(kind, String(form.get('id') || ''));
  revalidatePath('/operations');
}

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');
  const { q = '' } = await searchParams;
  const [state, companies, failures] = await Promise.all([getOperations(), getOperationsCompanies(q), getOperationsFailures()]);
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><div className="mx-auto max-w-6xl space-y-8">
    <Link href="/" className="text-emerald-300">Voltar ao painel</Link>
    <h1 className="text-3xl font-semibold">Operação da BellAI</h1>
    <p className="text-slate-400">Atualizado em {new Date(state.timestamp).toLocaleString('pt-BR')}. Recarregue para atualizar.</p>
    <div className="grid gap-4 sm:grid-cols-4">{[
      ['Empresas', state.companies], ['Workers ativos', state.activeWorkers],
      ['Espera de mensagens', `${state.oldestWebhookSeconds}s`], ['Espera de e-mails', `${state.oldestEmailSeconds}s`],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 p-5"><p>{label}</p><strong className="text-2xl">{value}</strong></div>)}</div>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Empresas</h2>
      <form className="flex gap-3"><input aria-label="Buscar empresa" name="q" defaultValue={q} maxLength={100} placeholder="Nome da empresa" className="rounded-lg bg-slate-800 p-3"/><button className="rounded-lg bg-emerald-700 px-4">Buscar</button></form>
      <p className="text-sm text-slate-400">Até 50 resultados. Refine a busca pelo nome.</p>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Empresa', 'Plano', 'Assinatura', 'Membros', 'Contatos', 'Conversas'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{companies.map(c => <tr key={c.id} className="border-t border-slate-800"><td className="p-3">{c.name}</td><td>{c.plan}</td><td>{c.subscriptionStatus}</td><td>{c._count.users}</td><td>{c._count.contacts}</td><td>{c._count.conversations}</td></tr>)}</tbody></table></div>
    </section>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Entregas com falha</h2><p className="text-slate-400">Reenvios são registrados na auditoria. E-mails expirados exigem um novo pedido de confirmação ou recuperação.</p>
      {[...failures.emails.map(j => ({ ...j, kind: 'email' as const, label: j.event, canRetry: new Date(j.expiresAt).getTime() > new Date(state.timestamp).getTime() })), ...failures.webhooks.map(j => ({ ...j, kind: 'webhook' as const, label: 'Mensagem WhatsApp', canRetry: true }))].map(j => <form action={retry} key={j.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 p-4"><input type="hidden" name="kind" value={j.kind}/><input type="hidden" name="id" value={j.id}/><span>{j.label} · {j.attempts} tentativas</span><code className="text-xs text-slate-400">{j.id}</code><button disabled={!j.canRetry} className="rounded-lg bg-emerald-700 px-4 py-2 disabled:opacity-40">Reprocessar entrega</button></form>)}
      {!failures.emails.length && !failures.webhooks.length && <p>Nenhuma entrega com falha.</p>}
    </section>
  </div></main>;
}
