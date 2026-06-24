'use client';

import { FormEvent, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { askBella } from '@/lib/api';

type BellaMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const starterMessages: BellaMessage[] = [
  {
    id: 'bella-welcome',
    role: 'assistant',
    text: 'Oi, eu sou a Bella. Posso te ajudar a configurar o bot, testar a simulação, organizar arquivos, entender o WhatsApp e navegar pelo painel.',
  },
];

export default function BellaAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BellaMessage[]>(starterMessages);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = input.trim();

    if (!text || pending) return;

    const userMessage: BellaMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };
    const previousMessages = [...messages, userMessage];

    setMessages(previousMessages);
    setInput('');
    setPending(true);

    try {
      const result = await askBella(text, previousMessages.slice(-12).map((message) => ({
        role: message.role,
        text: message.text,
      })));

      setMessages((current) => [
        ...current,
        {
          id: `bella-${Date.now()}`,
          role: 'assistant',
          text: result.response,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `bella-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Não consegui responder agora.',
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {!open && (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
          <div className="bella-hint rounded-2xl border border-emerald-400/30 bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-2xl">
            Precisa de ajuda?
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group inline-flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-600 px-4 py-3 text-left text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-emerald-500"
            aria-label="Fale com a Bella"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-sm font-semibold leading-5">Fale com a Bella</span>
              <span className="block text-xs text-emerald-50/85">IA de ajuda do painel</span>
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-24 z-40 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[420px]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Bella</p>
                <p className="truncate text-xs text-slate-400">Ajuda do painel</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-slate-300 transition hover:bg-slate-800" aria-label="Fechar Bella">
              <X size={16} />
            </button>
          </div>

          <div className="flex max-h-[58vh] min-h-[360px] flex-col gap-3 overflow-y-auto bg-slate-950/70 p-4 lg:max-h-[520px]">
            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? 'self-end bg-emerald-600 text-white' : 'self-start bg-slate-800 text-slate-100'}`}>
                  <p className="whitespace-pre-line break-words">{message.text}</p>
                </div>
              );
            })}
            {pending && (
              <div className="max-w-[88%] self-start rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                Bella está digitando...
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-800 bg-slate-900/90 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={2}
                placeholder="Pergunte sobre o painel..."
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500"
              />
              <button type="submit" disabled={!input.trim() || pending} className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700" aria-label="Enviar para Bella">
                {pending ? <MessageCircle size={17} /> : <Send size={17} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
