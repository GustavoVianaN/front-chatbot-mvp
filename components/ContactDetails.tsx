import type { Conversation } from '@/lib/types';
import { ToggleLeft, ToggleRight } from 'lucide-react';

type ContactDetailsProps = {
  conversation: Conversation | null;
};

export default function ContactDetails({ conversation }: ContactDetailsProps) {
  if (!conversation) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-slate-400 sm:rounded-3xl sm:p-6">Selecione uma conversa para ver dados de contato e contexto.</div>;
  }

  const contactName = conversation.contact?.name || conversation.contact?.phone || 'Contato sem nome';
  const contactPhone = conversation.contact?.phone || 'Telefone não informado';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:rounded-3xl sm:p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Detalhes do contato</p>
        <h2 className="mt-3 break-words text-lg font-semibold text-white sm:text-xl">{contactName}</h2>
        <p className="mt-2 break-words text-sm text-slate-400">{contactPhone}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:rounded-3xl sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-400">Primeira interação</span>
          <span className="font-medium text-slate-100">{new Date(conversation.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-400">Última interação</span>
          <span className="font-medium text-slate-100">{new Date(conversation.last_message_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-400">Status da conversa</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">{conversation.status}</span>
        </div>
        <div className="rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">Observações internas</p>
          <p className="mt-2 leading-6">Use o histórico da conversa para acompanhar contexto, preferências e pendências do atendimento.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Bot ativo</p>
            <p className="mt-1 text-sm text-slate-300">Uso do assistente nesta conversa</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            {conversation.botEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {conversation.botEnabled ? 'Ativo' : 'Inativo'}
          </button>
        </div>
      </div>
    </div>
  );
}
