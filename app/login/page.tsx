'use client';

import { FormEvent, useState } from 'react';

type LoginResponse = {
  success?: boolean;
  error?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}) as LoginResponse);

      if (!response.ok || !result.success) {
        setError(result.error || 'Não foi possível entrar.');
        return;
      }

      window.location.href = '/';
    } catch (error) {
      setError(error instanceof DOMException && error.name === 'AbortError'
        ? 'Tempo esgotado ao tentar entrar. Verifique sua conexão e tente novamente.'
        : 'Não foi possível conectar ao servidor.');
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Acesso administrativo</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Painel do chatbot</h1>
        <div className="mt-8 space-y-4">
          <label className="space-y-2 text-sm text-slate-300">
            Email
            <input
              autoComplete="email"
              maxLength={160}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Senha
            <input
              autoComplete="current-password"
              maxLength={120}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            />
          </label>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-rose-600/40 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70">
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
