'use client';

import { FormEvent, useState } from 'react';
import { MessageCircle } from 'lucide-react';

type FormState = {
  name: string;
  email: string;
  password: string;
  companyName: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

const TEXT_FIELDS: Array<[keyof Pick<FormState, 'name' | 'email' | 'companyName'>, string, string]> = [
  ['name', 'Seu nome', 'text'],
  ['email', 'E-mail', 'email'],
  ['companyName', 'Nome da empresa', 'text'],
];

const inputClassName =
  'mt-1.5 w-full rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-[15px] text-[#101828] transition focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20';

export default function SignupPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    companyName: '',
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const p = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMessage(p.error || 'Não foi possível criar a conta.');
      return;
    }
    setMessage('Conta criada. Você já pode entrar.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F7] px-5 py-12 text-[#101828] sm:px-8">
      <div className="w-full max-w-[560px]">
        <a
          href="/welcome"
          className="landing-enter mb-8 flex items-center justify-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079669] focus-visible:ring-offset-4"
          style={{ animationDelay: '0ms' }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#12B981] text-white shadow-sm">
            <MessageCircle aria-hidden="true" size={19} />
          </span>
          <span className="text-lg font-bold tracking-[-0.03em]">BellAI Connect</span>
        </a>

        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-[0_12px_32px_-24px_rgba(16,24,40,.18)] sm:p-10">
          <div className="landing-enter text-center" style={{ animationDelay: '80ms' }}>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.03em] sm:text-3xl">
              Comece a atender com IA em minutos
            </h1>
            <p className="mt-3 text-[15px] leading-6 text-[#667085]">
              Crie sua conta e configure a Bella para sua empresa.
            </p>
            <span className="mt-4 inline-flex items-center rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#067647]">
              100 respostas grátis · sem cartão
            </span>
          </div>

          <form onSubmit={submit} className="landing-enter mt-8 space-y-5" style={{ animationDelay: '160ms' }}>
            {TEXT_FIELDS.map(([key, label, type]) => (
              <label key={key} className="block text-sm font-semibold text-[#344054]">
                {label}
                <input
                  required
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
                  className={inputClassName}
                />
              </label>
            ))}

            <label className="block text-sm font-semibold text-[#344054]">
              Senha
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                className={inputClassName}
              />
              <span className="mt-1.5 block text-xs font-normal text-[#667085]">Mínimo de 10 caracteres</span>
            </label>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 text-sm text-[#475467]">
                <input
                  required
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => setForm((v) => ({ ...v, acceptTerms: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D0D5DD] text-[#10B981] focus:ring-[#10B981]"
                />
                <span>
                  Aceito os{' '}
                  <a className="font-semibold text-[#059669] hover:underline" href="/legal/terms">
                    Termos de Uso
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-sm text-[#475467]">
                <input
                  required
                  type="checkbox"
                  checked={form.acceptPrivacy}
                  onChange={(e) => setForm((v) => ({ ...v, acceptPrivacy: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D0D5DD] text-[#10B981] focus:ring-[#10B981]"
                />
                <span>
                  Li a{' '}
                  <a className="font-semibold text-[#059669] hover:underline" href="/legal/privacy">
                    Política de Privacidade
                  </a>
                </span>
              </label>
            </div>

            {message && <p className="rounded-xl bg-[#F2F4F7] p-3 text-sm text-[#344054]">{message}</p>}

            <button
              disabled={busy}
              className="landing-cta mt-2 w-full rounded-xl bg-[#059669] px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm hover:bg-[#047857] disabled:opacity-60"
            >
              {busy ? 'Criando...' : 'Criar minha conta →'}
            </button>

            <p className="text-center text-xs text-[#98A2B3]">100 respostas grátis · sem prazo</p>
          </form>
        </div>

        <p className="landing-enter mt-6 text-center text-sm text-[#667085]" style={{ animationDelay: '220ms' }}>
          Já tem uma conta?{' '}
          <a href="/login" className="font-semibold text-[#059669] hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
