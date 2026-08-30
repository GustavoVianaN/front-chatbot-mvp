import { getPlans } from '@/lib/api';

function formatBrl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function WelcomePage() {
  const plans = await getPlans().catch(() => []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[.3em] text-emerald-300">Bella para WhatsApp</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight">
          Atenda, qualifique e organize pedidos sem deixar o cliente esperando.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          A Bella aprende sobre sua empresa, responde dúvidas e coleta as informações necessárias
          antes de chamar sua equipe.
        </p>
        <div className="mt-8 flex gap-3">
          <a href="/signup" className="rounded-2xl bg-emerald-600 px-6 py-3 font-semibold">Começar teste de 14 dias</a>
          <a href="/login" className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold">Entrar</a>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-3">
          {['Atendimento pelo WhatsApp', 'Conhecimento da sua empresa', 'Transferência para sua equipe'].map((x) => (
            <div key={x} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="font-semibold">{x}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Configure no painel e acompanhe as conversas em um só lugar.</p>
            </div>
          ))}
        </div>

        {plans.length > 0 && (
          <div className="mt-24">
            <h2 className="text-3xl font-semibold">Planos</h2>
            <p className="mt-2 text-sm text-slate-400">
              Valores de lançamento, sujeitos a ajuste. Ativação confirmada pela nossa equipe após o pagamento.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {plans.map((p) => (
                <div key={p.plan} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                  <strong className="text-lg">{p.label}</strong>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{p.tagline}</p>
                  <p className="mt-4 text-3xl font-semibold">
                    {formatBrl(p.monthlyPriceBrl)}
                    <span className="text-sm font-normal text-slate-400">/mês</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">+ {formatBrl(p.setupFeeBrl)} de implantação (única vez)</p>
                  <ul className="mt-4 space-y-1 text-sm text-slate-300">
                    {p.highlights.map((h) => <li key={h}>• {h}</li>)}
                  </ul>
                  <a href="/signup" className="mt-5 block rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold">Começar</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
