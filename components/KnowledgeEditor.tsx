'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, Image as ImageIcon, Paperclip, Search, Trash2 } from 'lucide-react';
import type { KnowledgeFile, KnowledgeFileUpload, KnowledgeItem } from '@/lib/types';
import { createKnowledge, createKnowledgeFile, deleteKnowledge, deleteKnowledgeFile, getKnowledgeFileUrl, updateKnowledge, updateKnowledgeFile } from '@/lib/api';

type KnowledgeEditorProps = {
  knowledge: KnowledgeItem[];
  onChange: (items: KnowledgeItem[]) => void;
  files: KnowledgeFile[];
  onFilesChange: (files: KnowledgeFile[]) => void;
};

type FileDraft = {
  title: string;
  description: string;
  extracted_text: string;
  files: File[];
};

const categories = ['Horários', 'Preços', 'Serviços', 'Localização', 'Políticas', 'FAQ', 'Geral'] as const;
const allowedFileTypes = new Set(['application/pdf', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']);
const maxFileBytes = 5 * 1024 * 1024;
const maxFilesPerUpload = 100;
const emptyFileDraft: FileDraft = { title: '', description: '', extracted_text: '', files: [] };

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: KnowledgeFile) {
  return file.mime_type.startsWith('image/');
}

export default function KnowledgeEditor({ knowledge, onChange, files, onFilesChange }: KnowledgeEditorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [draft, setDraft] = useState({ title: '', category: 'Horários', content: '' });
  const [fileDraft, setFileDraft] = useState<FileDraft>(emptyFileDraft);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    return knowledge.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [knowledge, search, activeCategory]);

  const filteredFiles = useMemo(() => {
    const value = search.toLowerCase();
    return files.filter((file) => [
      file.title,
      file.description,
      file.extracted_text,
      file.original_filename,
      file.mime_type,
    ].join(' ').toLowerCase().includes(value));
  }, [files, search]);

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
    if (!window.confirm('Tem certeza que deseja excluir este texto dos arquivos do cliente?')) return;
    await deleteKnowledge(id);
    onChange(knowledge.filter((item) => item.id !== id));
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    setFileError('');
    const nextFiles = Array.from(selectedFiles || []);

    if (nextFiles.length === 0) {
      setFileDraft((current) => ({ ...current, files: [] }));
      return;
    }

    if (nextFiles.length > maxFilesPerUpload) {
      setFileError(`Selecione no máximo ${maxFilesPerUpload} arquivos por envio.`);
      return;
    }

    const invalidType = nextFiles.find((file) => !allowedFileTypes.has(file.type));
    if (invalidType) {
      setFileError('Formato não permitido. Use PNG, JPG, WEBP, GIF ou PDF.');
      return;
    }

    const oversizedFile = nextFiles.find((file) => file.size > maxFileBytes);
    if (oversizedFile) {
      setFileError('Cada arquivo deve ter no máximo 5 MB.');
      return;
    }

    setFileDraft((current) => ({
      ...current,
      title: nextFiles.length === 1 ? current.title || nextFiles[0].name.replace(/\.[^.]+$/, '') : current.title,
      files: nextFiles,
    }));
  };

  const handleUploadFile = async () => {
    if (fileDraft.files.length === 0 || uploading) return;
    setFileError('');
    setUploading(true);

    try {
      const createdFiles: KnowledgeFile[] = [];

      for (const file of fileDraft.files) {
        const payload: KnowledgeFileUpload = {
          title: fileDraft.files.length === 1 && fileDraft.title.trim()
            ? fileDraft.title.trim()
            : file.name.replace(/\.[^.]+$/, ''),
          description: fileDraft.description.trim(),
          extracted_text: fileDraft.extracted_text.trim(),
          original_filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          data_url: await readFileAsDataUrl(file),
          active: true,
        };
        const created = await createKnowledgeFile(payload);
        createdFiles.push(created);
      }

      onFilesChange([...createdFiles.reverse(), ...files]);
      setFileDraft(emptyFileDraft);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este arquivo?')) return;
    await deleteKnowledgeFile(id);
    onFilesChange(files.filter((file) => file.id !== id));
  };

  const handleToggleFile = async (file: KnowledgeFile) => {
    const updated = await updateKnowledgeFile(file.id, { active: !file.active });
    onFilesChange(files.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleOpenFile = async (id: string) => {
    const { url } = await getKnowledgeFileUrl(id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Arquivos</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Arquivos e informações do cliente</h2>
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Informação para o bot</p>
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
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Arquivo do cliente</p>
            <label className="space-y-2 text-sm text-slate-300">
              Título
              <input value={fileDraft.title} onChange={(event) => setFileDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Opcional quando enviar vários arquivos" className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Descrição
              <textarea value={fileDraft.description} onChange={(event) => setFileDraft((current) => ({ ...current, description: event.target.value }))} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Texto extraído ou observações para o bot
              <textarea value={fileDraft.extracted_text} onChange={(event) => setFileDraft((current) => ({ ...current, extracted_text: event.target.value }))} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
            </label>
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500">
              <Paperclip size={16} /> {fileDraft.files.length > 0 ? `${fileDraft.files.length} arquivo(s) selecionado(s)` : 'Selecionar até 100 PNG, JPG, WEBP, GIF ou PDF'}
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf"
                onChange={(event) => handleFileSelect(event.target.files)}
                className="hidden"
              />
            </label>
            {fileDraft.files.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                {fileDraft.files.slice(0, 8).map((file) => (
                  <p key={`${file.name}-${file.size}`} className="truncate">{file.name} · {formatFileSize(file.size)}</p>
                ))}
                {fileDraft.files.length > 8 && <p className="mt-1 text-slate-500">+ {fileDraft.files.length - 8} arquivo(s)</p>}
              </div>
            )}
            {fileError && <p className="text-sm text-rose-300">{fileError}</p>}
            <button type="button" onClick={handleUploadFile} disabled={fileDraft.files.length === 0 || uploading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 sm:w-auto">
              <CheckCircle2 size={16} /> {uploading ? `Enviando ${fileDraft.files.length} arquivo(s)...` : 'Enviar arquivo(s)'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
          <p className="text-sm font-semibold text-white">Informações cadastradas</p>
          <div className="mt-4 grid gap-4">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">Nenhum item encontrado.</div>
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
                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">{item.content}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{item.active ? 'Ativo' : 'Inativo'}</span>
                    <span>{new Date(item.updated_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
          <p className="text-sm font-semibold text-white">Arquivos cadastrados</p>
          <div className="mt-4 grid gap-4">
            {filteredFiles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">Nenhum arquivo encontrado.</div>
            ) : (
              filteredFiles.map((file) => (
                <div key={file.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-slate-400">
                      {isImageFile(file) ? <ImageIcon size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{file.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{file.original_filename} · {formatFileSize(file.size_bytes)}</p>
                      {file.description && <p className="mt-3 text-sm leading-6 text-slate-300">{file.description}</p>}
                      {file.extracted_text && <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-400">{file.extracted_text}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleOpenFile(file.id)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                      <ExternalLink size={13} /> Abrir
                    </button>
                    <button type="button" onClick={() => handleToggleFile(file)} className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                      {file.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button type="button" onClick={() => handleDeleteFile(file.id)} className="rounded-2xl border border-rose-600/40 bg-rose-600/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-600/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
