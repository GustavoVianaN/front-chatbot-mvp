import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, MessageCircle, Send, User } from 'lucide-react';
import type { Conversation, Message } from '@/lib/types';
import { getConversationMessages } from '@/lib/api';

type ConversationPanelProps = {
  conversation: Conversation | null;
  onReply: (message: string) => Promise<Message | void>;
  onUpdateStatus: (status: Conversation['status']) => Promise<void>;
  onToggleBot: (enabled: boolean) => Promise<void>;
};

const messageLabels = {
  cliente: 'Cliente',
  bot: 'Bot',
  atendente: 'Atendente',
};

export default function ConversationPanel({ conversation, onReply, onUpdateStatus, onToggleBot }: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }
    setLoading(true);
    getConversationMessages(conversation.id)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [conversation]);

  if (!conversation) {
    return <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-slate-400">Selecione uma conversa para visualizar aqui.</div>;
  }

  const contactName = conversation.contact?.name || conversation.contact?.phone || 'Contato sem nome';

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Conversa</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{contactName}</h2>
            <p className="mt-1 text-sm text-slate-400">Última atualização {new Date(conversation.last_message_at).toLocaleString('pt-BR')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onUpdateStatus('resolvido')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-700">
              <CheckCircle2 size={16} /> Marcar resolvida
            </button>
            <button type="button" onClick={() => onToggleBot(!conversation.botEnabled)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-700">
              <ArrowRight size={16} /> {conversation.botEnabled ? 'Devolver para o bot' : 'Assumir atendimento'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex h-full flex-col gap-4 overflow-y-auto pr-2">
          {loading ? (
            <div className="mt-8 text-center text-slate-400">Carregando mensagens...</div>
          ) : messages.length === 0 ? (
            <div className="mt-8 text-center text-slate-400">Nenhuma mensagem nesta conversa ainda.</div>
          ) : (
            messages.map((message) => {
              const isOutbound = message.direction === 'outbound';
              const isBot = message.sender_type === 'bot';
              return (
                <div key={message.id} className={`rounded-3xl p-4 ${isOutbound ? 'self-end bg-slate-800 text-slate-100' : 'self-start bg-slate-950/90 text-slate-200'}`}>
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                    {message.sender_type === 'cliente' ? <User size={14} /> : message.sender_type === 'bot' ? <MessageCircle size={14} /> : <CheckCircle2 size={14} />}
                    <span>{messageLabels[message.sender_type]}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-6">{message.text}</p>
                  <p className="mt-3 text-right text-[11px] text-slate-500">{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
        <label className="block text-sm font-medium text-slate-300">Resposta manual</label>
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={4}
          className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
          placeholder="Escreva sua resposta..."
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!reply.trim()) return;
              onReply(reply.trim()).then((created) => {
                if (created) {
                  setMessages((current) => [...current, created]);
                }
              });
              setReply('');
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Send size={16} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
