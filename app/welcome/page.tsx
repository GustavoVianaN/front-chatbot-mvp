export default function WelcomePage() {
  return <main className="min-h-screen bg-slate-950 px-6 py-16 text-white"><div className="mx-auto max-w-5xl">
    <p className="text-sm uppercase tracking-[.3em] text-emerald-300">Bella para WhatsApp</p>
    <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight">Atenda, qualifique e organize pedidos sem deixar o cliente esperando.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">A Bella aprende sobre sua empresa, responde dúvidas e coleta as informações necessárias antes de chamar sua equipe.</p>
    <div className="mt-8 flex gap-3"><a href="/signup" className="rounded-2xl bg-emerald-600 px-6 py-3 font-semibold">Começar teste de 14 dias</a><a href="/login" className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold">Entrar</a></div>
    <div className="mt-20 grid gap-5 md:grid-cols-3">{['Atendimento pelo WhatsApp','Conhecimento da sua empresa','Transferência para sua equipe'].map((x)=><div key={x} className="rounded-3xl border border-slate-800 bg-slate-900 p-6"><h2 className="font-semibold">{x}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Configure no painel e acompanhe as conversas em um só lugar.</p></div>)}</div>
  </div></main>;
}
