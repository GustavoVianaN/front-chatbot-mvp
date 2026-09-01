import { ArrowRight, Bot, Check, CheckCircle2, Clock3, Headphones, MessageCircle, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { getPlans } from '@/lib/api';
import { LANDING_PLAN_CONTENT, LANDING_PLAN_ORDER } from '@/lib/landing-plans';
import { Reveal, StickyLandingHeader } from '@/components/LandingMotion';

function formatBrl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const benefits = [
  { icon: Clock3, title: 'Atendimento instantâneo', description: 'Responda dúvidas frequentes mesmo quando sua equipe estiver offline.' },
  { icon: Sparkles, title: 'Conhece sua empresa', description: 'Ensine seus produtos, serviços, horários e regras para a Bella responder corretamente.' },
  { icon: Headphones, title: 'Sua equipe assume quando precisar', description: 'A Bella identifica quando deve parar e transfere a conversa para sua equipe com o contexto completo.' },
];

export default async function WelcomePage() {
  const plans = await getPlans().catch(() => []);
  const landingPlans = LANDING_PLAN_ORDER.map((planCode) => {
    const apiPlan = plans.find((plan) => plan.plan === planCode);
    const content = LANDING_PLAN_CONTENT[planCode];

    return {
      plan: planCode,
      description: content.description,
      // Preço e label vêm da API sempre que disponível — o valor local só
      // existe como fallback se a chamada a getPlans() falhar, para a
      // landing nunca mostrar um preço diferente do que é cobrado de
      // verdade (ver account.service.ts#PLAN_CATALOG).
      label: apiPlan?.label ?? content.label,
      monthlyPriceBrl: apiPlan?.monthlyPriceBrl ?? content.monthlyPriceBrl,
      highlights: apiPlan?.highlights ?? content.fallbackHighlights,
    };
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F9F7] text-[#101828]">
      <StickyLandingHeader>
        <nav aria-label="Navegação principal" className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="/welcome" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#12B981] text-white shadow-sm"><MessageCircle aria-hidden="true" size={21} /></span>
            <span className="text-xl font-bold tracking-[-0.03em]">BellAI Connect</span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#F2F4F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-2">Entrar</a>
            <a href="/signup" className="landing-cta hidden rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-2 sm:inline-flex">Começar grátis</a>
          </div>
        </nav>
      </StickyLandingHeader>

      <section className="relative">
        <div aria-hidden="true" className="absolute -right-40 top-10 h-96 w-96 rounded-full bg-[#ECFDF5] blur-3xl" />
        <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-16 lg:px-12 lg:py-24 xl:py-28">
          <div>
            <p className="landing-enter landing-enter-eyebrow mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#079669] sm:text-sm">Atendimento com IA para WhatsApp</p>
            <h1 className="landing-enter landing-enter-title max-w-[680px] text-[2.55rem] font-bold leading-[1.07] tracking-[-0.045em] text-[#101828] sm:text-5xl lg:text-[3.75rem] xl:text-[4rem]">Seu WhatsApp atendendo clientes 24 horas por dia.</h1>
            <p className="landing-enter landing-enter-copy mt-6 max-w-[620px] text-lg leading-8 text-[#667085] lg:text-xl">Com a BellAI Connect, a Bella responde dúvidas, qualifica clientes e organiza pedidos automaticamente e chama sua equipe quando necessário.</p>
            <div className="landing-enter landing-enter-actions mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/signup" className="landing-cta inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#059669] px-7 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-4">Começar grátis <ArrowRight aria-hidden="true" size={18} className="landing-cta-arrow" /></a>
              <a href="#como-funciona" className="inline-flex min-h-13 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-7 py-3.5 text-base font-semibold text-[#344054] transition hover:border-[#98A2B3] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-4">Ver como funciona</a>
            </div>
            <div className="landing-enter landing-enter-proof mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#667085]">
              {['100 respostas grátis', 'Sem cartão', 'Configure em minutos'].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><Check aria-hidden="true" size={16} className="text-[#079669]" /> {item}</span>)}
            </div>
          </div>

          <div className="landing-enter-mockup relative mx-auto w-full max-w-[580px] lg:max-w-none">
            <div className="absolute -left-5 top-10 hidden h-[82%] w-[92%] rounded-3xl border border-[#D1FADF] bg-[#ECFDF5] lg:block" />
            <div className="relative overflow-hidden rounded-[28px] border border-[#D0D5DD] bg-white shadow-[0_20px_50px_-24px_rgba(16,24,40,0.24)]">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#079669] text-white"><MessageCircle aria-hidden="true" size={20} /></div><div><p className="text-sm font-bold text-[#101828]">Atendimento no WhatsApp</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#667085]"><span className="h-2 w-2 rounded-full bg-[#12B981]" /> Bella online</p></div></div>
                <span className="hidden rounded-full border border-[#ABEFC6] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#067647] sm:inline-flex">Automático</span>
              </div>
              <div className="space-y-4 bg-[#F4F7F5] px-4 py-6 sm:px-6 sm:py-7">
                <div className="landing-message-enter landing-message-1 ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-[#D9FDD3] px-4 py-3 text-sm leading-6 text-[#1D2939] shadow-sm">Vocês entregam hoje?<p className="mt-1 text-right text-[10px] text-[#667085]">10:32</p></div>
                <div className="landing-message-enter landing-message-2 max-w-[84%] rounded-2xl rounded-tl-sm border border-[#E4E7EC] bg-white px-4 py-3 text-sm leading-6 text-[#1D2939] shadow-sm">Sim! Para qual bairro seria a entrega?<div className="mt-2 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#067647]"><Bot aria-hidden="true" size={12} /> Respondido pela Bella</span><span className="text-[10px] text-[#98A2B3]">10:32</span></div></div>
                <div className="landing-message-enter landing-message-3 ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-[#D9FDD3] px-4 py-3 text-sm leading-6 text-[#1D2939] shadow-sm">Água Verde<p className="mt-1 text-right text-[10px] text-[#667085]">10:33</p></div>
                <div className="landing-message-enter landing-message-4 max-w-[88%] rounded-2xl rounded-tl-sm border border-[#E4E7EC] bg-white px-4 py-3 text-sm leading-6 text-[#1D2939] shadow-sm">Entregamos hoje até às 18h. Quer que eu organize o pedido para você?<div className="mt-2 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#067647]"><Bot aria-hidden="true" size={12} /> Respondido pela Bella</span><span className="text-[10px] text-[#98A2B3]">10:33</span></div></div>
                <div className="landing-message-enter landing-message-5 flex items-center gap-3 rounded-xl border border-[#E4E7EC] bg-white/80 px-4 py-3 text-xs text-[#475467]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F2F4F7] text-[#475467]"><UserRound aria-hidden="true" size={15} /></span><span><strong className="block text-[#344054]">Sua equipe continua no controle</strong>A Bella transfere a conversa com todo o contexto quando necessário.</span></div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#E4E7EC] border-t border-[#E4E7EC] bg-white px-3 py-4 text-center"><div><strong className="block text-sm">24h</strong><span className="text-[10px] text-[#667085]">disponível</span></div><div><strong className="block text-sm">Instantâneo</strong><span className="text-[10px] text-[#667085]">primeiro contato</span></div><div><strong className="block text-sm">Humano</strong><span className="text-[10px] text-[#667085]">quando precisa</span></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-6 border-y border-[#E4E7EC] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[#ECFDF5] text-[#079669]"><ShieldCheck aria-hidden="true" size={22} /></div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Automatize o primeiro atendimento sem perder o controle da conversa.</h2>
            <p className="mt-4 text-base leading-7 text-[#667085]">A Bella cuida do trabalho repetitivo e deixa sua equipe livre para as conversas que realmente precisam de atenção.</p>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} delay={index * 100} className="h-full">
                <article className="landing-card h-full rounded-2xl border border-[#E4E7EC] bg-white p-7 shadow-[0_4px_12px_rgba(16,24,40,0.03)] lg:p-8">
                  <div className="landing-card-icon grid h-11 w-11 place-items-center rounded-xl bg-[#ECFDF5] text-[#079669]"><Icon aria-hidden="true" size={21} /></div>
                  <h3 className="mt-5 text-lg font-bold tracking-[-0.02em]">{title}</h3>
                  <p className="mt-2 text-[15px] leading-6 text-[#667085]">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F9F7]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-[120px]">
            <div className="max-w-2xl">
              <Reveal><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#079669]">Planos para começar</p></Reveal>
              <Reveal delay={90}><h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Escolha o plano ideal para sua operação.</h2></Reveal>
              <Reveal delay={180}><p className="mt-4 text-base leading-7 text-[#667085]">Comece com 100 respostas grátis, sem cartão e sem prazo, e escolha o plano que acompanha o crescimento do seu atendimento.</p></Reveal>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {landingPlans.map((plan, index) => (
                  <Reveal key={plan.plan} delay={index * 100} className="h-full">
                    <article className={`landing-card relative flex h-full flex-col rounded-2xl border bg-white p-7 lg:p-8 ${plan.plan === 'PRO' ? 'border-[#12B981] shadow-[0_12px_30px_-18px_rgba(7,150,105,.4)]' : 'border-[#E4E7EC]'}`}>
                      {plan.plan === 'PRO' && <span className="absolute right-5 top-5 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#067647]">Mais escolhido</span>}
                      <strong className="text-xl">{plan.label}</strong>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-[#667085]">{plan.description}</p>
                      <p className="mt-6 text-4xl font-bold tracking-[-0.04em]">{formatBrl(plan.monthlyPriceBrl)} <span className="text-sm font-medium tracking-normal text-[#667085]">/mês</span></p>
                      <ul className="mt-7 flex-1 space-y-3 text-sm text-[#475467]">{plan.highlights.map((highlight) => <li key={highlight} className="flex gap-2.5"><CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-[#079669]" />{highlight}</li>)}</ul>
                      <a href="/signup" className="landing-cta mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#059669] px-5 py-3 text-sm font-semibold text-white hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-2">Começar grátis</a>
                      <p className="mt-2 text-center text-xs font-medium text-[#667085]">Teste com 100 respostas grátis</p>
                    </article>
                  </Reveal>
              ))}
            </div>
          </div>
      </section>

      <section className="bg-[#101828] text-white"><Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-16 sm:px-8 md:flex-row md:items-center lg:px-12"><div><h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Seu próximo atendimento pode começar agora.</h2><p className="mt-2 text-[#D0D5DD]">Configure sua conta na BellAI Connect em minutos e teste com 100 respostas grátis.</p></div><a href="/signup" className="landing-cta inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-7 py-3.5 font-semibold text-white hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101828] sm:w-auto">Começar grátis <ArrowRight aria-hidden="true" size={18} className="landing-cta-arrow" /></a></Reveal></section>
      <footer className="border-t border-[#E4E7EC] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-[#667085] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><span>© {new Date().getFullYear()} BellAI Connect. Atendimento inteligente para WhatsApp.</span><div className="flex gap-5"><a className="hover:text-[#101828]" href="/legal/terms">Termos</a><a className="hover:text-[#101828]" href="/legal/privacy">Privacidade</a></div></div></footer>
    </main>
  );
}
