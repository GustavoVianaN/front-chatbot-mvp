'use client';

import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Não foi possível enviar as instruções agora. Tente novamente em alguns minutos.');
      setMessage('Se o e-mail estiver cadastrado, você receberá um link válido por uma hora. Confira também a caixa de spam.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível solicitar a recuperação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">BellAI</p>
        <h1 className="mt-3 text-3xl font-semibold">Recuperar senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Informe o e-mail cadastrado para receber um link seguro de redefinição.</p>
        <label className="mt-6 block text-sm font-medium text-slate-300">
          E-mail
          <input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-500" />
        </label>
        {message && <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">{message}</p>}
        {error && <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">{error}</p>}
        <button disabled={submitting} className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Enviando...' : 'Enviar instruções'}</button>
        <a href="/login" className="mt-5 block text-center text-sm text-slate-400 transition hover:text-white">Voltar para o login</a>
      </form>
    </main>
  );
}
