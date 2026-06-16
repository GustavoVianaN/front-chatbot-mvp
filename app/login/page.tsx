'use client';

import { FormEvent, useState } from 'react';
import { login } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await login(username, password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Não foi possível entrar.');
      return;
    }

    window.location.href = '/';
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Acesso administrativo</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Painel do chatbot</h1>
        <div className="mt-8 space-y-4">
          <label className="space-y-2 text-sm text-slate-300">
            Usuário
            <input
              autoComplete="username"
              maxLength={120}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
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
