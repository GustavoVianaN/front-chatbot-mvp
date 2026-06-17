import type { Conversation } from '@/lib/types';
import { BadgeCheck, MessageCircle } from 'lucide-react';

type ConversationListProps = {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const statusLabel = {
  aberto: 'Aberto',
  resolvido: 'Resolvido',
};

export default function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Conversas</p>
          <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">Fila ativa</h2>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 sm:flex">
          <BadgeCheck size={14} /> Bot ativo
        </div>
      </div>
      <div className="space-y-3">
        {conversations.map((conversation) => {
          const active = conversation.id === selectedId;
          const contactName = conversation.contact?.name || conversation.contact?.phone || 'Contato sem nome';
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                active ? 'border-slate-500 bg-slate-800 text-white shadow-panel' : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-semibold">{contactName}</p>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${conversation.status === 'aberto' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-700 text-slate-200'}`}>{statusLabel[conversation.status]}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">Última mensagem: {conversation.last_message || (conversation.status === 'aberto' ? 'Aguardando resposta' : 'Conversa finalizada')}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(conversation.last_message_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-slate-300">
                  <MessageCircle size={12} /> {conversation.botEnabled ? 'Bot' : 'Manual'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
