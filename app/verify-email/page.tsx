'use client';

import { useEffect, useRef, useState } from 'react';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirmando seu e-mail...');

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token') || '';
    fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        setStatus(ok ? 'success' : 'error');
        setMessage(ok ? 'E-mail confirmado. Sua conta está pronta para entrar.' : body.error || 'Este link é inválido ou expirou.');
      })
      .catch(() => { setStatus('error'); setMessage('Não foi possível confirmar o e-mail agora.'); });
  }, []);

  return <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center"><h1 className="text-2xl font-semibold">Confirmação de e-mail</h1><p className={`mt-4 text-sm ${status === 'error' ? 'text-rose-300' : 'text-slate-300'}`}>{message}</p>{status !== 'loading' && <a href={status === 'success' ? '/login?verified=1' : '/login'} className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold">Ir para o login</a>}</section></main>;
}
