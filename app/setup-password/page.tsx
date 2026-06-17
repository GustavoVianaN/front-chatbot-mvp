'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { setupPassword } from '@/lib/api';

function SetupPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Link inválido ou incompleto.');
      return;
    }

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setSubmitting(true);
    const result = await setupPassword(token, password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Não foi possível definir a senha.');
      return;
    }

    setSuccess(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Primeiro acesso</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Definir senha</h1>

        {success ? (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-100">
              Senha definida com sucesso. Você já pode entrar no painel.
            </div>
            <a href="/login" className="block w-full rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-500">
              Ir para login
            </a>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-4">
              <label className="space-y-2 text-sm text-slate-300">
                Nova senha
                <input
                  autoComplete="new-password"
                  maxLength={160}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                Confirmar senha
                <input
                  autoComplete="new-password"
                  maxLength={160}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
                />
              </label>
            </div>
            {error && <div className="mt-4 rounded-2xl border border-rose-600/40 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
            <button type="submit" disabled={submitting} className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70">
              {submitting ? 'Salvando...' : 'Definir senha'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <SetupPasswordForm />
    </Suspense>
  );
}
