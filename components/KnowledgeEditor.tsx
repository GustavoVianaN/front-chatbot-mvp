'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';
import type { KnowledgeItem } from '@/lib/types';
import { createKnowledge, deleteKnowledge, updateKnowledge } from '@/lib/api';

type KnowledgeEditorProps = {
  knowledge: KnowledgeItem[];
  onChange: (items: KnowledgeItem[]) => void;
};

const categories = ['Horários', 'Preços', 'Serviços', 'Localização', 'Políticas', 'FAQ', 'Geral'] as const;

export default function KnowledgeEditor({ knowledge, onChange }: KnowledgeEditorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [draft, setDraft] = useState({ title: '', category: 'Horários', content: '' });

  const filtered = useMemo(() => {
    return knowledge.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [knowledge, search, activeCategory]);

  const handleSave = async () => {
    if (!draft.title || !draft.content) return;
    if (editing) {
      const updated = await updateKnowledge(editing.id, { title: draft.title, category: draft.category as KnowledgeItem['category'], content: draft.content });
      if (updated) {
        onChange(knowledge.map((item) => (item.id === updated.id ? updated : item)));
      }
      setEditing(null);
    } else {
      const created = await createKnowledge({ title: draft.title, category: draft.category as KnowledgeItem['category'], content: draft.content, active: true });
      onChange([created, ...knowledge]);
    }
    setDraft({ title: '', category: 'Horários', content: '' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item da base de conhecimento?')) return;
    await deleteKnowledge(id);
    onChange(knowledge.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Base de Conhecimento</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Conteúdo do atendimento</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-slate-500" />
            </div>
            <label className="space-y-2 text-sm text-slate-300">
              Categoria
              <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
                <option value="Todas">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="space-y-2 text-sm text-slate-300">
            Título
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Categoria
            <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Conteúdo
            <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} rows={5} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSave} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:w-auto">
              <CheckCircle2 size={16} /> {editing ? 'Atualizar item' : 'Adicionar item'}
            </button>
            {editing && (
              <button type="button" onClick={() => {
                setEditing(null);
                setDraft({ title: '', category: 'Horários', content: '' });
              }} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
                Cancelar
              </button>
            )}
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Base geral</p>
            <p className="mt-2 leading-6">Use esta área para inserir regras, horários ou respostas padrão que o bot deve considerar.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">Nenhum item encontrado com esses filtros.</div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-500">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      setEditing(item);
                      setDraft({ title: item.title, category: item.category, content: item.content });
                    }} className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="rounded-2xl border border-rose-600/40 bg-rose-600/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-600/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">{item.content}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{item.active ? 'Ativo' : 'Inativo'}</span>
                  <span>{new Date(item.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
