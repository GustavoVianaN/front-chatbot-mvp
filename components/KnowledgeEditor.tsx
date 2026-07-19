'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, ExternalLink, FileText, Image as ImageIcon, Link, Mic, Package, Paperclip, RefreshCw, Search, Square, Trash2 } from 'lucide-react';
import type { IntegrationConnection, IntegrationInput, KnowledgeDescriptionAudio, KnowledgeDescriptionAudioPreview, KnowledgeFile, KnowledgeFileUpload, KnowledgeItem, KnowledgeSource, KnowledgeSourceInput, KnowledgeStatus, ProductImportPreview, ProductItem, ProductItemInput } from '@/lib/types';
import { createIntegrationConnection, createKnowledge, createKnowledgeFile, createKnowledgeSource, createProductItem, deleteKnowledge, deleteKnowledgeFile, deleteKnowledgeSource, deleteProductItem, getKnowledgeFileUrl, importProductItems, previewKnowledgeDescriptionAudio, previewProductItemsImport, syncKnowledgeSource, updateIntegrationConnection, updateKnowledge, updateKnowledgeFile, updateKnowledgeSource, updateProductItem } from '@/lib/api';

type KnowledgeEditorProps = {
  knowledge: KnowledgeItem[];
  onChange: (items: KnowledgeItem[]) => void;
  files: KnowledgeFile[];
  onFilesChange: (files: KnowledgeFile[]) => void;
  sources: KnowledgeSource[];
  onSourcesChange: (sources: KnowledgeSource[]) => void;
  status: KnowledgeStatus | null;
  products: ProductItem[];
  onProductsChange: (products: ProductItem[]) => void;
  integrations: IntegrationConnection[];
  onIntegrationsChange: (items: IntegrationConnection[]) => void;
};

type FileDraft = {
  title: string;
  description: string;
  content_description: string;
  content_description_audio?: KnowledgeDescriptionAudio;
  extracted_text: string;
  files: File[];
};

type LinkDraft = {
  title: string;
  source_type: string;
  url: string;
  description: string;
  content_description: string;
  content_description_audio?: KnowledgeDescriptionAudio;
};

type ProductDraft = ProductItemInput;

const categories = ['Horários', 'Preços', 'Serviços', 'Localização', 'Políticas', 'FAQ', 'Geral'] as const;
const allowedFileTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const allowedFileExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|png|jpe?g|webp|gif)$/i;
const maxFileBytes = 5 * 1024 * 1024;
const maxFilesPerUpload = 100;
const emptyFileDraft: FileDraft = { title: '', description: '', content_description: '', extracted_text: '', files: [] };
const emptyLinkDraft: LinkDraft = { title: '', source_type: 'google_sheets', url: '', description: '', content_description: '' };
const contentDescriptionExamples = [
  'Esse PDF explica os serviços da empresa.',
  'Esse documento explica as políticas de troca e atendimento.',
  'Esse link tem os horários e endereços atualizados.',
  'Esse arquivo tem perguntas frequentes dos clientes.',
  'Esse documento contém o passo a passo do suporte.',
];
const emptyProductDraft: ProductDraft = {
  item_type: 'produto',
  name: '',
  description: '',
  price: '',
  category: '',
  sku: '',
  image_url: '',
  source: '',
  active: true,
  starts_at: '',
  ends_at: '',
};
const emptyIntegrationDraft: IntegrationInput = { provider: 'CRM', name: '', status: 'planned', config: '', active: false };
const fieldLabelClass = 'grid gap-2 text-sm font-semibold text-slate-300';
const fieldClass = 'h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 text-sm text-white outline-none transition focus:border-emerald-400';
const textareaClass = 'min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400';
const shortTextareaClass = 'min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400';
const primaryButtonClass = 'inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700';
const secondaryButtonClass = 'inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60';

function scrollToKnowledgeBlock(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const field = element?.querySelector('input, textarea, select, button') as HTMLElement | null;
  field?.focus({ preventScroll: true });
}

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

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o áudio.'));
    reader.readAsDataURL(blob);
  });
}

function isImageFile(file: KnowledgeFile) {
  return file.mime_type.startsWith('image/');
}

function isAllowedFile(file: File) {
  return allowedFileTypes.has(file.type) || allowedFileExtensions.test(file.name);
}

function mimeTypeForFile(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return byExtension[extension || ''] || 'application/octet-stream';
}

export default function KnowledgeEditor({ knowledge, onChange, files, onFilesChange, sources, onSourcesChange, status, products, onProductsChange, integrations, onIntegrationsChange }: KnowledgeEditorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [draft, setDraft] = useState({ title: '', category: 'Horários', content: '' });
  const [fileDraft, setFileDraft] = useState<FileDraft>(emptyFileDraft);
  const [fileError, setFileError] = useState('');
  const [linkDraft, setLinkDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [linkError, setLinkError] = useState('');
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft);
  const [productImportFile, setProductImportFile] = useState<File | null>(null);
  const [productImportPreview, setProductImportPreview] = useState<ProductImportPreview | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productError, setProductError] = useState('');
  const [productImportError, setProductImportError] = useState('');
  const [integrationDraft, setIntegrationDraft] = useState<IntegrationInput>(emptyIntegrationDraft);
  const [uploading, setUploading] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [importingProducts, setImportingProducts] = useState(false);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<'file' | 'link' | null>(null);
  const [previewingAudioTarget, setPreviewingAudioTarget] = useState<'file' | 'link' | null>(null);
  const [fileAudioPreview, setFileAudioPreview] = useState<KnowledgeDescriptionAudioPreview | null>(null);
  const [linkAudioPreview, setLinkAudioPreview] = useState<KnowledgeDescriptionAudioPreview | null>(null);
  const [recordingError, setRecordingError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      file.content_description,
      file.extracted_text,
      file.original_filename,
      file.mime_type,
    ].join(' ').toLowerCase().includes(value));
  }, [files, search]);

  const filteredSources = useMemo(() => {
    const value = search.toLowerCase();
    return sources.filter((source) => [
      source.title,
      source.description,
      source.content_description,
      source.url,
      source.source_type,
      source.extracted_text,
    ].join(' ').toLowerCase().includes(value));
  }, [sources, search]);

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase();
    return products.filter((item) => [
      item.name,
      item.description,
      item.price,
      item.category,
      item.sku,
      item.item_type,
    ].join(' ').toLowerCase().includes(value));
  }, [products, search]);

  const knowledgeGuideItems = [
    {
      label: 'Adicionar uma resposta fixa',
      description: 'Use para horários, trocas, prazo, preço, políticas ou uma pergunta frequente.',
      ready: knowledge.some((item) => item.active && item.content.trim()),
      target: 'knowledge-manual',
    },
    {
      label: 'Enviar arquivos da empresa',
      description: 'PDF, texto ou imagem com políticas, processos, FAQ e informações institucionais.',
      ready: files.some((file) => file.active),
      target: 'knowledge-files',
    },
    {
      label: 'Adicionar links úteis',
      description: 'Site, Google Sheets, catálogo online, cardápio ou página pública.',
      ready: sources.some((source) => source.active),
      target: 'knowledge-links',
    },
    {
      label: 'Cadastrar produtos ou preços',
      description: 'Ajuda o bot a responder sobre catálogo, valores, modelos e promoções.',
      ready: products.some((item) => item.active && item.name.trim()),
      target: 'knowledge-products',
    },
  ];
  const missingKnowledgeGuideItems = knowledgeGuideItems.filter((item) => !item.ready);
  const nextKnowledgeGuideItems = (missingKnowledgeGuideItems.length ? missingKnowledgeGuideItems : knowledgeGuideItems).slice(0, 3);

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

  const startDescriptionRecording = async (target: 'file' | 'link') => {
    setRecordingError('');
    if (target === 'file') {
      setFileAudioPreview(null);
    } else {
      setLinkAudioPreview(null);
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Seu navegador não permite gravação de áudio aqui.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const audio: KnowledgeDescriptionAudio = {
          original_filename: `explicacao-${Date.now()}.webm`,
          mime_type: mimeType,
          size_bytes: blob.size,
          data_url: await readBlobAsDataUrl(blob),
        };

        if (target === 'file') {
          setFileDraft((current) => ({ ...current, content_description_audio: audio }));
        } else {
          setLinkDraft((current) => ({ ...current, content_description_audio: audio }));
        }

        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setRecordingTarget(null);

        try {
          setPreviewingAudioTarget(target);
          const preview = await previewKnowledgeDescriptionAudio({
            audio,
            target,
            title: target === 'file' ? fileDraft.title : linkDraft.title,
            file_name: target === 'file' ? fileDraft.files[0]?.name : linkDraft.url,
          });

          if (target === 'file') {
            setFileAudioPreview(preview);
          } else {
            setLinkAudioPreview(preview);
          }
        } catch (error) {
          setRecordingError(error instanceof Error ? error.message : 'Não foi possível transcrever o áudio agora.');
        } finally {
          setPreviewingAudioTarget(null);
        }
      };

      recorder.start();
      setRecordingTarget(target);
    } catch {
      setRecordingError('Não foi possível acessar o microfone.');
    }
  };

  const stopDescriptionRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
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

    const invalidType = nextFiles.find((file) => !isAllowedFile(file));
    if (invalidType) {
      setFileError('Formato não permitido. Use PDF, Word, Excel, PowerPoint, CSV, TXT, PNG, JPG, WEBP ou GIF.');
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
          content_description: fileDraft.content_description.trim(),
          content_description_audio: fileDraft.content_description_audio,
          extracted_text: fileDraft.extracted_text.trim(),
          original_filename: file.name,
          mime_type: mimeTypeForFile(file),
          size_bytes: file.size,
          data_url: await readFileAsDataUrl(file),
          active: true,
        };
        const created = await createKnowledgeFile(payload);
        createdFiles.push(created);
      }

      onFilesChange([...createdFiles.reverse(), ...files]);
      setFileDraft(emptyFileDraft);
      setFileAudioPreview(null);
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

  const handleCreateSource = async () => {
    if (!linkDraft.title.trim() || !linkDraft.url.trim() || savingLink) return;
    setLinkError('');
    setSavingLink(true);

    try {
      const payload: KnowledgeSourceInput = {
        title: linkDraft.title.trim(),
        source_type: linkDraft.source_type,
        url: linkDraft.url.trim(),
        description: linkDraft.description.trim(),
        content_description: linkDraft.content_description.trim(),
        content_description_audio: linkDraft.content_description_audio,
        active: true,
      };
      const created = await createKnowledgeSource(payload);
      onSourcesChange([created, ...sources]);
      setLinkDraft(emptyLinkDraft);
      setLinkAudioPreview(null);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Não foi possível sincronizar o link.');
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este link?')) return;
    await deleteKnowledgeSource(id);
    onSourcesChange(sources.filter((source) => source.id !== id));
  };

  const handleToggleSource = async (source: KnowledgeSource) => {
    const updated = await updateKnowledgeSource(source.id, { active: !source.active });
    onSourcesChange(sources.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleSyncSource = async (source: KnowledgeSource) => {
    const updated = await syncKnowledgeSource(source.id);
    onSourcesChange(sources.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleSaveProduct = async () => {
    if (!productDraft.name.trim() || savingProduct) return;
    setProductError('');
    setSavingProduct(true);

    try {
      if (editingProductId) {
        const updated = await updateProductItem(editingProductId, productDraft);
        onProductsChange(products.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createProductItem(productDraft);
        onProductsChange([created, ...products]);
      }
      setProductDraft(emptyProductDraft);
      setEditingProductId(null);
    } catch (error) {
      setProductError(error instanceof Error ? error.message : 'Não foi possível salvar o item.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = (item: ProductItem) => {
    setEditingProductId(item.id);
    setProductDraft({
      item_type: item.item_type,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      sku: item.sku,
      image_url: item.image_url,
      source: item.source,
      active: item.active,
      starts_at: item.starts_at,
      ends_at: item.ends_at,
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item comercial?')) return;
    await deleteProductItem(id);
    onProductsChange(products.filter((item) => item.id !== id));
  };

  const productImportPayload = async () => {
    if (!productImportFile) return null;

    return {
      original_filename: productImportFile.name,
      mime_type: mimeTypeForFile(productImportFile),
      data_url: await readFileAsDataUrl(productImportFile),
      default_item_type: productDraft.item_type,
      source: productImportFile.name,
    };
  };

  const handlePreviewProducts = async () => {
    if (!productImportFile || importingProducts) return;
    setProductImportError('');
    setProductImportPreview(null);
    setImportingProducts(true);

    try {
      const payload = await productImportPayload();
      if (!payload) return;
      const preview = await previewProductItemsImport(payload);
      setProductImportPreview(preview);

      if (preview.totalRows === 0) {
        setProductImportError('Não encontrei linhas para pré-visualizar. Confira se o arquivo tem cabeçalho e pelo menos uma linha de produto.');
      } else if (preview.validRows === 0) {
        setProductImportError('Li o arquivo, mas nenhuma linha tem nome de produto. Use uma coluna chamada Nome, Produto, Item, Título ou Name.');
      }
    } catch (error) {
      setProductImportError(error instanceof Error ? error.message : 'Não foi possível pré-visualizar produtos.');
    } finally {
      setImportingProducts(false);
    }
  };

  const handleImportProducts = async () => {
    if (!productImportFile || importingProducts) return;
    setProductImportError('');
    setImportingProducts(true);

    try {
      const payload = await productImportPayload();
      if (!payload) return;
      const result = await importProductItems(payload);
      onProductsChange([...result.items, ...products]);
      setProductImportFile(null);
      setProductImportPreview(null);
    } catch (error) {
      setProductImportError(error instanceof Error ? error.message : 'Não foi possível importar produtos.');
    } finally {
      setImportingProducts(false);
    }
  };

  const handleCreateIntegration = async () => {
    if (!integrationDraft.name.trim() || savingIntegration) return;
    setSavingIntegration(true);

    try {
      const created = await createIntegrationConnection(integrationDraft);
      onIntegrationsChange([created, ...integrations]);
      setIntegrationDraft(emptyIntegrationDraft);
    } finally {
      setSavingIntegration(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Arquivos</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Base de atendimento e produtos</h2>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,280px)_180px] xl:w-auto">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conteúdo" className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/90 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-400" />
            </div>
            <select aria-label="Filtrar por categoria" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} className={fieldClass}>
              <option value="Todas">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Status da base', value: status?.status || 'pronto' },
            { label: 'Prontos', value: String(status?.ready ?? 0) },
            { label: 'Com erro', value: String(status?.errors ?? 0) },
            { label: 'Última indexação', value: status?.last_indexed_at ? new Date(status.last_indexed_at).toLocaleString('pt-BR') : 'Sem indexação' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 break-words text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-950/90 p-4 sm:p-5">
          <div>
            <p className="text-sm font-bold text-white">Onde devo adicionar cada informação?</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">Escolha pelo tipo do conteúdo. As duas áreas alimentam o bot, mas têm finalidades diferentes.</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => scrollToKnowledgeBlock('knowledge-manual')}
              className="group rounded-3xl border border-sky-500/30 bg-sky-500/10 p-5 text-left transition hover:border-sky-400 hover:bg-sky-500/15"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-200"><Building2 size={21} /></span>
                <div>
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-200">BASE DE ATENDIMENTO</span>
                  <p className="mt-3 text-base font-bold text-white">Informações da empresa para atender clientes</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">Horários, endereço, políticas, processos, perguntas frequentes, documentos, respostas prontas e links institucionais.</p>
                  <p className="mt-3 text-xs font-semibold text-sky-200">Não use para cadastrar dados pessoais de consumidores.</p>
                </div>
              </div>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-sky-200">Adicionar informação de atendimento <ArrowRight size={14} /></span>
            </button>

            <button
              type="button"
              onClick={() => scrollToKnowledgeBlock('knowledge-products')}
              className="group rounded-3xl border border-violet-500/30 bg-violet-500/10 p-5 text-left transition hover:border-violet-400 hover:bg-violet-500/15"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200"><Package size={21} /></span>
                <div>
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">PRODUTOS E SERVIÇOS</span>
                  <p className="mt-3 text-base font-bold text-white">Informações comerciais do catálogo</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">Nome, descrição, preço, categoria, código/SKU, estoque, modelos, promoções, cardápios e catálogos.</p>
                  <p className="mt-3 text-xs font-semibold text-violet-200">Use quando o cliente puder perguntar “quanto custa?” ou “qual modelo tem?”.</p>
                </div>
              </div>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-200">Adicionar produto ou serviço <ArrowRight size={14} /></span>
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-emerald-500/20 bg-slate-950/80 p-4">
          <div className="flex items-start gap-3">
            <img src="/brand/bella-avatar.png" alt="Bella" className="bella-guide-avatar h-14 w-14 rounded-2xl border border-emerald-500/30 bg-slate-900 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Bella</p>
              <p className="mt-2 text-lg font-bold leading-8 text-white sm:text-xl">
                Aqui você ensina o bot com arquivos, links, produtos e respostas prontas.
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Comece pelo que você já tem. Eu marquei abaixo os próximos pontos que mais ajudam a melhorar as respostas.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {nextKnowledgeGuideItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToKnowledgeBlock(item.target)}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-emerald-500/40 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                  </div>
                  <span className={item.ready ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-200' : 'rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-200'}>
                    {item.ready ? 'OK' : 'Falta'}
                  </span>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-200">
                  Ir para preencher <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div id="knowledge-manual" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Informação de atendimento</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Horários, políticas, regras, processos, FAQ e respostas fixas da empresa.</p>
              </div>
            </div>
            <div className="grid gap-4">
            <label className={fieldLabelClass}>
              Título
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className={fieldClass} />
            </label>
            <label className={fieldLabelClass}>
              Categoria
              <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className={fieldClass}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className={fieldLabelClass}>
              Conteúdo
              <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} rows={5} className={textareaClass} />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSave} className={`${primaryButtonClass} w-full sm:w-auto`}>
                <CheckCircle2 size={16} /> {editing ? 'Atualizar item' : 'Adicionar item'}
              </button>
              {editing && (
              <button type="button" onClick={() => {
                  setEditing(null);
                  setDraft({ title: '', category: 'Horários', content: '' });
                }} className={secondaryButtonClass}>
                  Cancelar
                </button>
              )}
            </div>
            </div>
          </div>

          <div id="knowledge-files" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <Paperclip size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Documentos da empresa</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">PDFs, textos e imagens com informações de atendimento. Catálogos e preços ficam na área de Produtos.</p>
              </div>
            </div>
            <div className="grid gap-4">
            <label className={fieldLabelClass}>
              Título
              <input value={fileDraft.title} onChange={(event) => setFileDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Opcional quando enviar vários arquivos" className={fieldClass} />
            </label>
            <label className={fieldLabelClass}>
              Descrição
              <textarea value={fileDraft.description} onChange={(event) => setFileDraft((current) => ({ ...current, description: event.target.value }))} rows={2} className={shortTextareaClass} />
            </label>
            <label className={fieldLabelClass}>
              Texto extraído ou observações para o bot
              <textarea value={fileDraft.extracted_text} onChange={(event) => setFileDraft((current) => ({ ...current, extracted_text: event.target.value }))} rows={3} className={shortTextareaClass} />
            </label>
            <label className="group flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 transition hover:border-emerald-400 hover:bg-emerald-500/5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-emerald-300 group-hover:bg-emerald-500/10">
                <Paperclip size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-white">{fileDraft.files.length > 0 ? `${fileDraft.files.length} arquivo(s) selecionado(s)` : 'Selecionar arquivos'}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">PDF, DOCX, XLSX, CSV, TXT, PowerPoint ou imagens.</span>
              </span>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,text/csv,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
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
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <label className={fieldLabelClass}>
                Explique para a IA o que é esse conteúdo
                <textarea
                  value={fileDraft.content_description}
                  onChange={(event) => setFileDraft((current) => ({ ...current, content_description: event.target.value }))}
                  rows={3}
                  placeholder="Ex: Esse PDF contém as políticas de troca e o passo a passo do atendimento."
                  className={shortTextareaClass}
                />
              </label>
              <p className="text-xs leading-5 text-slate-400">Você pode escrever ou gravar um áudio explicando rapidamente como a IA deve usar esse conteúdo.</p>
              <div className="grid gap-1 text-xs leading-5 text-slate-500">
                {contentDescriptionExamples.map((example) => <p key={example}>* {example}</p>)}
              </div>
              <button
                type="button"
                onClick={() => recordingTarget === 'file' ? stopDescriptionRecording() : void startDescriptionRecording('file')}
                className={`${secondaryButtonClass} w-full bg-slate-900 sm:w-auto`}
              >
                {recordingTarget === 'file' ? <Square size={16} /> : <Mic size={16} />}
                {recordingTarget === 'file' ? 'Parar gravação' : fileDraft.content_description_audio ? 'Gravar novamente' : 'Gravar áudio'}
              </button>
              {previewingAudioTarget === 'file' && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="flex items-center gap-2 font-semibold">
                    <RefreshCw size={14} className="animate-spin" />
                    Transcrevendo áudio e lendo o que você explicou...
                  </p>
                </div>
              )}
              {fileAudioPreview && recordingTarget !== 'file' && previewingAudioTarget !== 'file' && (
                <div className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Transcrição</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{fileAudioPreview.transcription || 'Não foi possível transcrever com clareza.'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">O que a IA entendeu</p>
                    <p className="mt-1 text-sm leading-6 text-white">{fileAudioPreview.understanding}</p>
                  </div>
                </div>
              )}
              {fileDraft.content_description_audio && recordingTarget !== 'file' && !fileAudioPreview && previewingAudioTarget !== 'file' && <p className="text-xs text-emerald-300">Áudio gravado.</p>}
            </div>
            {recordingError && <p className="text-sm text-rose-300">{recordingError}</p>}
            {fileError && <p className="text-sm text-rose-300">{fileError}</p>}
            <button type="button" onClick={handleUploadFile} disabled={fileDraft.files.length === 0 || uploading} className={`${primaryButtonClass} w-full`}>
              <CheckCircle2 size={16} /> {uploading ? `Enviando ${fileDraft.files.length} arquivo(s)...` : 'Enviar arquivo(s)'}
            </button>
            </div>
          </div>

          <div id="knowledge-links" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <Link size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Links</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Site, Google Sheets, catálogo público ou página externa.</p>
              </div>
            </div>
            <div className="grid gap-4">
            <label className={fieldLabelClass}>
              Nome
              <input value={linkDraft.title} onChange={(event) => setLinkDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Tabela de preços" className={fieldClass} />
            </label>
            <label className={fieldLabelClass}>
              Tipo
              <select value={linkDraft.source_type} onChange={(event) => setLinkDraft((current) => ({ ...current, source_type: event.target.value }))} className={fieldClass}>
                <option value="google_sheets">Google Sheets</option>
                <option value="csv">CSV público</option>
                <option value="page">Página pública</option>
                <option value="other">Outro link</option>
              </select>
            </label>
            <label className={fieldLabelClass}>
              URL
              <input value={linkDraft.url} onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://docs.google.com/spreadsheets/..." className={fieldClass} />
            </label>
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <label className={fieldLabelClass}>
                Explique para a IA o que é esse conteúdo
                <textarea
                  value={linkDraft.content_description}
                  onChange={(event) => setLinkDraft((current) => ({ ...current, content_description: event.target.value }))}
                  rows={3}
                  placeholder="Ex: Esse link contém os horários, endereços e regras de atendimento."
                  className={shortTextareaClass}
                />
              </label>
              <p className="text-xs leading-5 text-slate-400">Você pode escrever ou gravar um áudio explicando rapidamente como a IA deve usar esse conteúdo.</p>
              <div className="grid gap-1 text-xs leading-5 text-slate-500">
                {contentDescriptionExamples.map((example) => <p key={example}>* {example}</p>)}
              </div>
              <button
                type="button"
                onClick={() => recordingTarget === 'link' ? stopDescriptionRecording() : void startDescriptionRecording('link')}
                className={`${secondaryButtonClass} w-full bg-slate-900 sm:w-auto`}
              >
                {recordingTarget === 'link' ? <Square size={16} /> : <Mic size={16} />}
                {recordingTarget === 'link' ? 'Parar gravação' : linkDraft.content_description_audio ? 'Gravar novamente' : 'Gravar áudio'}
              </button>
              {previewingAudioTarget === 'link' && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="flex items-center gap-2 font-semibold">
                    <RefreshCw size={14} className="animate-spin" />
                    Transcrevendo áudio e lendo o que você explicou...
                  </p>
                </div>
              )}
              {linkAudioPreview && recordingTarget !== 'link' && previewingAudioTarget !== 'link' && (
                <div className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Transcrição</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{linkAudioPreview.transcription || 'Não foi possível transcrever com clareza.'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">O que a IA entendeu</p>
                    <p className="mt-1 text-sm leading-6 text-white">{linkAudioPreview.understanding}</p>
                  </div>
                </div>
              )}
              {linkDraft.content_description_audio && recordingTarget !== 'link' && !linkAudioPreview && previewingAudioTarget !== 'link' && <p className="text-xs text-emerald-300">Áudio gravado.</p>}
            </div>
            <label className={fieldLabelClass}>
              Descrição
              <textarea value={linkDraft.description} onChange={(event) => setLinkDraft((current) => ({ ...current, description: event.target.value }))} rows={3} className={shortTextareaClass} />
            </label>
            {recordingError && <p className="text-sm text-rose-300">{recordingError}</p>}
            {linkError && <p className="text-sm text-rose-300">{linkError}</p>}
            <button type="button" onClick={handleCreateSource} disabled={!linkDraft.title.trim() || !linkDraft.url.trim() || savingLink} className={`${primaryButtonClass} w-full`}>
              <Link size={16} /> {savingLink ? 'Sincronizando...' : 'Adicionar link'}
            </button>
            </div>
          </div>
        </div>
      </div>

      <div id="knowledge-products" className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-300 sm:text-sm sm:tracking-[0.24em]">Produtos e serviços · área comercial</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Produtos, catálogo e promoções</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Cadastre aqui somente itens que tenham nome comercial, preço, modelo, código, estoque, promoção ou descrição de venda.</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{editingProductId ? 'Editando item comercial' : 'Adicionar item comercial'}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Cadastre um produto, serviço, catálogo ou promoção individualmente.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className={fieldLabelClass}>
            Tipo
            <select value={productDraft.item_type} onChange={(event) => setProductDraft((current) => ({ ...current, item_type: event.target.value as ProductDraft['item_type'] }))} className={fieldClass}>
              <option value="produto">Produto</option>
              <option value="serviço">Serviço</option>
              <option value="catalogo">Catálogo</option>
              <option value="promocao">Promoção</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            Nome
            <input value={productDraft.name} onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))} className={fieldClass} />
          </label>
          <label className={fieldLabelClass}>
            Preço
            <input value={productDraft.price} onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))} placeholder="R$ 99,90" className={fieldClass} />
          </label>
          <label className={fieldLabelClass}>
            Categoria
            <input value={productDraft.category} onChange={(event) => setProductDraft((current) => ({ ...current, category: event.target.value }))} className={fieldClass} />
          </label>
          <label className={fieldLabelClass}>
            SKU/código
            <input value={productDraft.sku} onChange={(event) => setProductDraft((current) => ({ ...current, sku: event.target.value }))} className={fieldClass} />
          </label>
          <label className={fieldLabelClass}>
            Fonte
            <input value={productDraft.source} onChange={(event) => setProductDraft((current) => ({ ...current, source: event.target.value }))} placeholder="Planilha, catálogo, campanha..." className={fieldClass} />
          </label>
          <label className={`${fieldLabelClass} lg:col-span-3`}>
            Descrição
            <textarea value={productDraft.description} onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))} rows={3} className={shortTextareaClass} />
          </label>
          <label className={`${fieldLabelClass} lg:col-span-3`}>
            URL da imagem
            <input value={productDraft.image_url} onChange={(event) => setProductDraft((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." className={fieldClass} />
          </label>
          </div>
          {productError && <p className="mt-4 text-sm text-rose-300">{productError}</p>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {editingProductId && (
              <button type="button" onClick={() => { setEditingProductId(null); setProductDraft(emptyProductDraft); }} className={secondaryButtonClass}>
                Cancelar
              </button>
            )}
            <button type="button" onClick={handleSaveProduct} disabled={!productDraft.name.trim() || savingProduct} className={`${primaryButtonClass} sm:min-w-40`}>
              <CheckCircle2 size={16} /> {editingProductId ? 'Atualizar item' : 'Adicionar item'}
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
              <Paperclip size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Importar por planilha ou arquivo</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Pré-visualize antes de importar para conferir nomes, preços e linhas inválidas.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <label className="inline-flex h-14 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 px-4 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:bg-emerald-500/5">
              <Paperclip size={16} className="shrink-0" />
              <span className="truncate">{productImportFile ? productImportFile.name : 'Selecionar planilha ou catálogo'}</span>
              <input
                type="file"
                accept=".xls,.xlsx,.csv,.txt,.pdf,.doc,.docx,.ppt,.pptx,text/csv,text/plain,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setProductImportFile(event.target.files?.[0] || null);
                  setProductImportPreview(null);
                  setProductImportError('');
                }}
                className="hidden"
              />
            </label>
            <button type="button" onClick={handlePreviewProducts} disabled={!productImportFile || importingProducts} className={`${secondaryButtonClass} lg:min-w-36`}>
              {importingProducts ? 'Lendo...' : 'Pré-visualizar'}
            </button>
            <button type="button" onClick={handleImportProducts} disabled={!productImportFile || !productImportPreview?.validRows || importingProducts} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 lg:min-w-44">
              Confirmar importação
            </button>
          </div>
          {productImportError && (
            <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm leading-5 text-rose-200">
              {productImportError}
            </p>
          )}
          {productImportPreview && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-sm text-slate-300">{productImportPreview.validRows} item(ns) válidos, {productImportPreview.invalidRows} com erro.</p>
              {productImportPreview.items.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  Nenhuma linha encontrada no arquivo.
                </div>
              ) : (
                <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-800">
                  {productImportPreview.items.slice(0, 20).map((item) => (
                    <div key={`${item.row}-${item.name || item.error}`} className="grid gap-2 border-b border-slate-800 p-3 text-xs text-slate-300 last:border-b-0 sm:grid-cols-[64px_1fr_1fr_1fr]">
                      <span>Linha {item.row}</span>
                      <span className="font-medium text-white">{item.name || 'Sem nome'}</span>
                      <span>{item.price || 'Sem preço'}</span>
                      <span className={item.valid ? 'text-emerald-300' : 'text-rose-300'}>{item.valid ? item.item_type : item.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
          <p className="text-sm font-semibold text-white">Informações de atendimento cadastradas</p>
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
                      <p className="mt-1 text-xs text-slate-500">Indexação: {file.index_status === 'ready' ? 'pronto' : file.index_status === 'error' ? 'erro' : 'processando'}{file.indexed_at ? ` · ${new Date(file.indexed_at).toLocaleString('pt-BR')}` : ''}</p>
                      {file.index_error && <p className="mt-2 text-xs text-rose-300">{file.index_error}</p>}
                      {file.description && <p className="mt-3 text-sm leading-6 text-slate-300">{file.description}</p>}
                      {file.content_description && <p className="mt-3 whitespace-pre-line rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-5 text-slate-300">{file.content_description}</p>}
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

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
          <p className="text-sm font-semibold text-white">Links cadastrados</p>
          <div className="mt-4 grid gap-4">
            {filteredSources.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">Nenhum link encontrado.</div>
            ) : (
              filteredSources.map((source) => (
                <div key={source.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-slate-400">
                      <Link size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{source.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{source.source_type} · {source.last_synced_at ? new Date(source.last_synced_at).toLocaleString('pt-BR') : 'não sincronizado'}</p>
                      <p className="mt-1 text-xs text-slate-500">Indexação: {source.index_status === 'ready' ? 'pronto' : source.index_status === 'error' ? 'erro' : 'processando'}{source.indexed_at ? ` · ${new Date(source.indexed_at).toLocaleString('pt-BR')}` : ''}</p>
                      {source.index_error && <p className="mt-2 text-xs text-rose-300">{source.index_error}</p>}
                      <p className="mt-2 truncate text-xs text-slate-500">{source.url}</p>
                      {source.description && <p className="mt-3 text-sm leading-6 text-slate-300">{source.description}</p>}
                      {source.content_description && <p className="mt-3 whitespace-pre-line rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-5 text-slate-300">{source.content_description}</p>}
                      {source.extracted_text && <p className="mt-3 line-clamp-4 whitespace-pre-line text-xs leading-5 text-slate-400">{source.extracted_text}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                      <ExternalLink size={13} /> Abrir
                    </button>
                    <button type="button" onClick={() => handleSyncSource(source)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                      <RefreshCw size={13} /> Sincronizar
                    </button>
                    <button type="button" onClick={() => handleToggleSource(source)} className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                      {source.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button type="button" onClick={() => handleDeleteSource(source.id)} className="rounded-2xl border border-rose-600/40 bg-rose-600/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-600/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div id="knowledge-integrations" className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <p className="text-sm font-semibold text-white">Itens comerciais cadastrados</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400 md:col-span-2 xl:col-span-3">Nenhum produto, catálogo ou promoção encontrado.</div>
          ) : (
            filteredProducts.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.item_type}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${item.active ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>{item.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                {item.price && <p className="mt-3 text-lg font-semibold text-emerald-200">{item.price}</p>}
                {item.category && <p className="mt-2 text-xs text-slate-500">{item.category}{item.sku ? ` · ${item.sku}` : ''}</p>}
                {item.description && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">{item.description}</p>}
                {item.image_url && <button type="button" onClick={() => window.open(item.image_url, '_blank', 'noopener,noreferrer')} className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white"><ExternalLink size={13} /> Ver imagem</button>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleEditProduct(item)} className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">Editar</button>
                  <button type="button" onClick={async () => {
                    const updated = await updateProductItem(item.id, { active: !item.active });
                    onProductsChange(products.map((current) => (current.id === updated.id ? updated : current)));
                  }} className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                    {item.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button type="button" onClick={() => handleDeleteProduct(item.id)} className="rounded-2xl border border-rose-600/40 bg-rose-600/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-600/20">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Integrações</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Integrações externas</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className={fieldLabelClass}>
            Provedor
            <select value={integrationDraft.provider} onChange={(event) => setIntegrationDraft((current) => ({ ...current, provider: event.target.value }))} className={fieldClass}>
              <option value="ERP">ERP</option>
              <option value="CRM">CRM</option>
              <option value="Shopify">Shopify</option>
              <option value="WooCommerce">WooCommerce</option>
              <option value="Bling">Bling</option>
              <option value="Tiny">Tiny</option>
              <option value="Mercado Livre">Mercado Livre</option>
              <option value="Nuvemshop">Nuvemshop</option>
              <option value="Outro">Outro</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            Nome
            <input value={integrationDraft.name} onChange={(event) => setIntegrationDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Minha integração" className={fieldClass} />
          </label>
          <label className={fieldLabelClass}>
            Status
            <select value={integrationDraft.status} onChange={(event) => setIntegrationDraft((current) => ({ ...current, status: event.target.value }))} className={fieldClass}>
              <option value="planned">Planejada</option>
              <option value="configured">Configurada</option>
              <option value="error">Erro</option>
            </select>
          </label>
          <button type="button" onClick={handleCreateIntegration} disabled={!integrationDraft.name.trim() || savingIntegration} className={`${primaryButtonClass} self-end w-full`}>
            Adicionar
          </button>
          <label className={`${fieldLabelClass} lg:col-span-4`}>
            Configuração/observações
            <textarea value={integrationDraft.config} onChange={(event) => setIntegrationDraft((current) => ({ ...current, config: event.target.value }))} rows={3} placeholder="Campos necessários, URL, observações ou instruções para ativar depois." className={shortTextareaClass} />
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {integrations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400 md:col-span-2 xl:col-span-4">Nenhuma integração registrada.</div>
          ) : integrations.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm font-semibold text-white">{item.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.provider}</p>
              <p className="mt-3 text-sm text-slate-300">{item.status === 'planned' ? 'Planejada' : item.status}</p>
              {item.config && <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400">{item.config}</p>}
              <button type="button" onClick={async () => {
                const updated = await updateIntegrationConnection(item.id, { active: !item.active });
                onIntegrationsChange(integrations.map((current) => (current.id === updated.id ? updated : current)));
              }} className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500">
                {item.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
