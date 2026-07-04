'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, MessageCircle, Paperclip, Plus, RotateCcw, Send, TestTube2, Trash2, X } from 'lucide-react';
import type { AutomationRule, AutomationRuleInput, BotConfig, SimulationAttachment, SimulationLog } from '@/lib/types';
import { generateBotTestResponse, getSimulationLogs } from '@/lib/api';

type BotConfigPanelProps = {
  botConfig: BotConfig;
  onSave: (data: BotConfig) => Promise<void>;
  onRefresh: () => Promise<BotConfig>;
  mode?: 'simulation' | 'config';
  automationRules?: AutomationRule[];
  onAutomationRulesChange?: (rules: AutomationRule[]) => void;
  onCreateAutomationRule?: (rule: AutomationRuleInput) => Promise<AutomationRule>;
  onUpdateAutomationRule?: (id: string, rule: Partial<AutomationRuleInput>) => Promise<AutomationRule>;
  onDeleteAutomationRule?: (id: string) => Promise<{ success: true }>;
};

type TestMessage = {
  id: string;
  role: 'customer' | 'bot';
  text: string;
  attachmentName?: string;
};

const simulationFileTypes = new Set([
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
const simulationFileExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|png|jpe?g|webp|gif)$/i;
const maxSimulationFileBytes = 5 * 1024 * 1024;

function formatConversationContext(messages: TestMessage[]) {
  return messages
    .map((message) => `${message.role === 'customer' ? 'Cliente' : 'Bot'}: ${message.text}`)
    .join('\n');
}

function newSimulationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2, 14)}`.padEnd(36, '0');
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function mimeTypeForFile(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const fallback: Record<string, string> = {
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    pdf: 'application/pdf',
    png: 'image/png',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    webp: 'image/webp',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return extension ? fallback[extension] || 'application/octet-stream' : 'application/octet-stream';
}

const defaultRule: AutomationRuleInput = {
  name: '',
  trigger_type: 'palavra_especifica',
  trigger_value: '',
  action: 'encaminhar_humano',
  department: '',
  priority: 'normal',
  response_message: '',
  active: true,
};

const commercialInstructionFlags = [
  {
    id: 'buy',
    label: 'Quer comprar',
    instruction: 'Quando o cliente quiser comprar, identifique o produto desejado, modelo ou variação necessária, quantidade e dados mínimos para continuar o atendimento.',
  },
  {
    id: 'price',
    label: 'Pedir preço',
    instruction: 'Quando o cliente pedir preço, procure o produto ou serviço na base cadastrada. Se faltar o item exato, pergunte qual produto, modelo ou variação ele quer.',
  },
  {
    id: 'deadline',
    label: 'Pedir prazo',
    instruction: 'Quando o cliente pedir prazo, confirme produto ou pedido relacionado e colete cidade, CEP ou forma de entrega quando isso for necessário para responder.',
  },
  {
    id: 'shipping',
    label: 'Frete',
    instruction: 'Quando o cliente perguntar sobre frete, colete cidade, CEP, produto e forma de entrega quando necessário. Responda apenas com dados encontrados na base cadastrada.',
  },
  {
    id: 'exchange',
    label: 'Troca',
    instruction: 'Quando o cliente falar sobre troca, colete número do pedido se existir, produto, problema relatado, data da compra e preferência de solução quando necessário.',
  },
  {
    id: 'order_status',
    label: 'Status de pedido',
    instruction: 'Quando o cliente pedir status de pedido, peça o número do pedido ou identificação mínima necessária antes de responder.',
  },
] as const;

type CommercialInstructionFlagId = (typeof commercialInstructionFlags)[number]['id'];

const commercialInstructionIntro = 'Instruções principais configuradas por flags comerciais:';
const commercialInstructionCommon = 'Quando o cliente enviar uma saudação inicial ou pedir ajuda de forma genérica, responda com a mensagem de boas-vindas cadastrada, sem alterar o sentido. Conduza a conversa coletando as informações necessárias conforme o assunto. Se faltar informação, faça uma pergunta por vez.';

function selectedCommercialInstructionIds(instructions: string): CommercialInstructionFlagId[] {
  return commercialInstructionFlags
    .filter((flag) => instructions.includes(flag.instruction))
    .map((flag) => flag.id);
}

function buildCommercialInstructions(form: Pick<BotConfig, 'assistant_name' | 'company_name'>, selectedIds: CommercialInstructionFlagId[]) {
  const assistantName = form.assistant_name.trim() || 'Assistente';
  const companyName = form.company_name.trim() || 'empresa';
  const identityInstruction = `Você é a ${assistantName}, IA de atendimento da ${companyName}.`;
  const selectedInstructions = commercialInstructionFlags
    .filter((flag) => selectedIds.includes(flag.id))
    .map((flag) => `- ${flag.instruction}`);

  return [
    identityInstruction,
    'Atenda clientes sobre produtos, pedidos, trocas, entregas, personalização, dúvidas comerciais e suporte inicial.',
    commercialInstructionIntro,
    commercialInstructionCommon,
    ...selectedInstructions,
  ].join('\n');
}

function normalizeInstructionsForSave(form: BotConfig): BotConfig {
  return {
    ...form,
    instructions: buildCommercialInstructions(form, selectedCommercialInstructionIds(form.instructions)),
  };
}

export default function BotConfigPanel({
  botConfig,
  onSave,
  onRefresh,
  mode = 'config',
  automationRules = [],
  onAutomationRulesChange,
  onCreateAutomationRule,
  onUpdateAutomationRule,
  onDeleteAutomationRule,
}: BotConfigPanelProps) {
  const [form, setForm] = useState<BotConfig>(botConfig);
  const [newRule, setNewRule] = useState<AutomationRuleInput>(defaultRule);
  const [testMessage, setTestMessage] = useState('');
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [simulationId, setSimulationId] = useState(() => newSimulationId());
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([]);
  const [simulationFile, setSimulationFile] = useState<File | null>(null);
  const [simulationFileError, setSimulationFileError] = useState('');
  const [testing, setTesting] = useState(false);
  const [refreshingSimulation, setRefreshingSimulation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(botConfig);
  }, [botConfig]);

  useEffect(() => {
    if (mode !== 'simulation') return;

    getSimulationLogs()
      .then(setSimulationLogs)
      .catch(() => undefined);
  }, [mode]);

  const handleChange = (field: keyof BotConfig, value: string | boolean | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCommercialInstruction = (flagId: CommercialInstructionFlagId) => {
    setForm((current) => {
      const selectedIds = selectedCommercialInstructionIds(current.instructions);
      const nextIds = selectedIds.includes(flagId)
        ? selectedIds.filter((id) => id !== flagId)
        : [...selectedIds, flagId];

      return {
        ...current,
        instructions: buildCommercialInstructions(current, nextIds),
      };
    });
  };

  const saveRule = async () => {
    if (!newRule.name.trim() || !onCreateAutomationRule || !onAutomationRulesChange) return;
    const created = await onCreateAutomationRule(newRule);
    onAutomationRulesChange([created, ...automationRules]);
    setNewRule(defaultRule);
  };

  const patchRule = async (id: string, updates: Partial<AutomationRuleInput>) => {
    if (!onUpdateAutomationRule || !onAutomationRulesChange) return;
    const updated = await onUpdateAutomationRule(id, updates);
    onAutomationRulesChange(automationRules.map((rule) => rule.id === id ? updated : rule));
  };

  const removeRule = async (id: string) => {
    if (!onDeleteAutomationRule || !onAutomationRulesChange) return;
    await onDeleteAutomationRule(id);
    onAutomationRulesChange(automationRules.filter((rule) => rule.id !== id));
  };

  const resetSimulation = async () => {
    setTestMessage('');
    setSimulationFile(null);
    setSimulationFileError('');
    setTestMessages([]);
    setSimulationId(newSimulationId());

    try {
      setRefreshingSimulation(true);
      const latestConfig = await onRefresh();
      setForm(latestConfig);
    } finally {
      setRefreshingSimulation(false);
    }
  };

  const handleSimulationFileSelect = (file?: File) => {
    setSimulationFileError('');

    if (!file) {
      setSimulationFile(null);
      return;
    }

    const mimeType = mimeTypeForFile(file);

    if (!simulationFileTypes.has(mimeType) && !simulationFileExtensions.test(file.name)) {
      setSimulationFileError('Envie imagem, PDF, Word, Excel, PowerPoint, CSV ou TXT.');
      setSimulationFile(null);
      return;
    }

    if (file.size > maxSimulationFileBytes) {
      setSimulationFileError('O arquivo da simulação pode ter no máximo 5MB.');
      setSimulationFile(null);
      return;
    }

    setSimulationFile(file);
  };

  const sendTestMessage = async () => {
    const message = testMessage.trim();

    if ((!message && !simulationFile) || testing) return;

    const fileToSend = simulationFile;

    const customerMessage: TestMessage = {
      id: `customer-${Date.now()}`,
      role: 'customer',
      text: message || 'Arquivo enviado para análise.',
      attachmentName: fileToSend?.name,
    };
    const previousMessages = testMessages;

    setTestMessages((current) => [...current, customerMessage]);
    setTestMessage('');
    setSimulationFile(null);
    setSimulationFileError('');
    setTesting(true);

    try {
      const attachment: SimulationAttachment | undefined = fileToSend
        ? {
          original_filename: fileToSend.name,
          mime_type: mimeTypeForFile(fileToSend),
          size_bytes: fileToSend.size,
          data_url: await readFileAsDataUrl(fileToSend),
        }
        : undefined;
      const result = await generateBotTestResponse(form, message, formatConversationContext(previousMessages), simulationId, attachment);
      setSimulationId(result.simulationId);
      setTestMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: result.response,
        },
      ]);
      setSimulationLogs((current) => [result.log, ...current].slice(0, 100));
    } catch (error) {
      setTestMessages((current) => [
        ...current,
        {
          id: `bot-error-${Date.now()}`,
          role: 'bot',
          text: error instanceof Error ? error.message : 'Não foi possível gerar a resposta.',
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  if (mode === 'simulation') {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-panel sm:rounded-3xl">
          <div className="flex flex-col gap-4 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-300">
                <TestTube2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Simulação do bot</p>
                <p className="truncate text-xs text-slate-400">{form.assistant_name || 'Bot'} - usa a configuração salva, igual ao WhatsApp</p>
              </div>
            </div>
            <button type="button" onClick={resetSimulation} disabled={refreshingSimulation} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              <RotateCcw size={16} />
              Nova conversa
            </button>
          </div>

          <div className="flex min-h-[520px] flex-col gap-3 overflow-y-auto bg-slate-950/70 p-4 sm:p-5">
            {testMessages.length === 0 ? (
              <div className="m-auto max-w-sm text-center text-sm leading-6 text-slate-400">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-emerald-300">
                  <MessageCircle size={20} />
                </div>
                <p className="mt-4 text-base font-medium text-white">Nova conversa iniciada</p>
                <p className="mt-2">{refreshingSimulation ? 'Recarregando configuração do banco...' : 'Digite ou anexe um arquivo como cliente para testar o mesmo comportamento usado no WhatsApp.'}</p>
              </div>
            ) : (
              testMessages.map((message) => {
                const isCustomer = message.role === 'customer';

                return (
                  <div key={message.id} className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${isCustomer ? 'self-end bg-emerald-600 text-white' : 'self-start bg-slate-800 text-slate-100'}`}>
                    {message.attachmentName && (
                      <div className={`mb-2 inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isCustomer ? 'bg-emerald-700/80 text-white' : 'bg-slate-900 text-slate-200'}`}>
                        <FileText size={14} />
                        <span className="truncate">{message.attachmentName}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line break-words">{message.text}</p>
                  </div>
                );
              })
            )}
            {testing && (
              <div className="max-w-[86%] self-start rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                Digitando...
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-900/90 p-3 sm:p-4">
            {simulationFile && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Paperclip size={16} />
                  <span className="truncate">{simulationFile.name}</span>
                </span>
                <button type="button" onClick={() => setSimulationFile(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="Remover anexo">
                  <X size={16} />
                </button>
              </div>
            )}
            {simulationFileError && <p className="mb-3 text-sm text-rose-300">{simulationFileError}</p>}
            <div className="flex gap-2">
              <textarea
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendTestMessage();
                  }
                }}
                rows={2}
                placeholder="Digite como cliente..."
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500"
              />
              <label className="inline-flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-200 transition hover:bg-slate-800 hover:text-white" aria-label="Anexar arquivo">
                <Paperclip size={17} />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,text/csv,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={(event) => handleSimulationFileSelect(event.target.files?.[0])}
                  className="hidden"
                />
              </label>
              <button type="button" onClick={sendTestMessage} disabled={(!testMessage.trim() && !simulationFile) || testing} className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700" aria-label="Enviar mensagem">
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300 sm:rounded-3xl sm:p-6">
          <p className="font-semibold text-white">Como testar</p>
          <p className="mt-2 leading-6">Use “Nova conversa” para simular outro usuário. Você pode anexar imagem ou arquivo para testar o mesmo tipo de análise que o bot faz no atendimento.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Histórico</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Simulações salvas</h2>
            </div>
            <button type="button" onClick={async () => setSimulationLogs(await getSimulationLogs())} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 transition hover:bg-slate-800 sm:w-auto">
              <RotateCcw size={16} />
              Atualizar histórico
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {simulationLogs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
                Nenhuma simulação salva ainda.
              </div>
            ) : (
              simulationLogs.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Conversa {log.simulation_id.slice(0, 8)} · Turno {log.turn_index}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{log.assistant_name || form.assistant_name}</span>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-emerald-600/10 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Cliente</p>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-100">{log.user_message}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-800 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bot</p>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-100">{log.bot_response}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Configurar Bot</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Assistente Bella</h2>
          </div>
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              await onSave(normalizeInstructionsForSave(form));
              setSaving(false);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:w-auto"
          >
            <CheckCircle2 size={16} /> Salvar
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            Nome do assistente
            <input value={form.assistant_name} onChange={(event) => handleChange('assistant_name', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Nome da empresa
            <input value={form.company_name} onChange={(event) => handleChange('company_name', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Descrição da empresa
            <textarea value={form.company_description} onChange={(event) => handleChange('company_description', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Ramo do negócio
            <input value={form.segment} onChange={(event) => handleChange('segment', event.target.value)} placeholder="Ex.: pet shop, academia, imobiliária, oficina, escola..." className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Site
            <input value={form.website} onChange={(event) => handleChange('website', event.target.value)} placeholder="https://..." className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Missão
            <textarea value={form.mission} onChange={(event) => handleChange('mission', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Público-alvo
            <textarea value={form.target_audience} onChange={(event) => handleChange('target_audience', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Endereço
            <input value={form.address} onChange={(event) => handleChange('address', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Redes sociais
            <textarea value={form.social_links} onChange={(event) => handleChange('social_links', event.target.value)} rows={2} placeholder="Instagram, Facebook, LinkedIn, TikTok..." className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 lg:col-span-2">
            <div>
              <p className="text-sm font-semibold text-white">Instruções principais</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">Marque os assuntos que o bot deve conduzir. O sistema cria as instruções internas automaticamente.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {commercialInstructionFlags.map((flag) => {
                const checked = selectedCommercialInstructionIds(form.instructions).includes(flag.id);

                return (
                  <button
                    key={flag.id}
                    type="button"
                    onClick={() => toggleCommercialInstruction(flag.id)}
                    className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${checked ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white'}`}
                    aria-pressed={checked}
                  >
                    {flag.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="space-y-2 text-sm text-slate-300">
            Tom de voz
            <input value={form.tone} onChange={(event) => handleChange('tone', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Idioma
            <input value={form.language} onChange={(event) => handleChange('language', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Formalidade
            <select value={form.formality} onChange={(event) => handleChange('formality', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
              <option value="informal">Informal</option>
              <option value="neutro">Neutro</option>
              <option value="formal">Formal</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Limite de resposta
            <select value={form.response_length} onChange={(event) => handleChange('response_length', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
              <option value="curta">Curta</option>
              <option value="média">Média</option>
              <option value="detalhada">Detalhada</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Formato de envio no WhatsApp
            <select value={form.message_split_mode || 'auto'} onChange={(event) => handleChange('message_split_mode', event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
              <option value="auto">Uma mensagem, dividir só se ficar grande</option>
              <option value="sentence">Dividir por ponto/frase</option>
              <option value="single">Sempre tentar enviar em um bloco</option>
            </select>
            <span className="block text-xs leading-5 text-slate-500">Quando escolher dividir por ponto/frase, cada frase da mesma resposta vira uma mensagem separada.</span>
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Tempo máximo de espera em segundos
            <input type="number" min={5} max={600} value={form.max_wait_seconds} onChange={(event) => handleChange('max_wait_seconds', Number(event.target.value))} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Dias de funcionamento
            <input value={form.working_days} onChange={(event) => handleChange('working_days', event.target.value)} placeholder="segunda, terça, quarta, quinta, sexta..." className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <div className="lg:col-span-2">
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">Guardrails e Escopo</p>
          </div>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Escopo permitido
            <textarea value={form.business_scope} onChange={(event) => handleChange('business_scope', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Guardrails obrigatórios
            <textarea value={form.guardrails} onChange={(event) => handleChange('guardrails', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Assuntos bloqueados
            <textarea value={form.blocked_topics} onChange={(event) => handleChange('blocked_topics', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Quando encaminhar para humano
            <textarea value={form.handoff_triggers} onChange={(event) => handleChange('handoff_triggers', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Regras de resposta
            <textarea value={form.response_rules} onChange={(event) => handleChange('response_rules', event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem de boas-vindas
            <textarea value={form.welcome_message} onChange={(event) => handleChange('welcome_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem de fallback
            <textarea value={form.fallback_message} onChange={(event) => handleChange('fallback_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem fora do horário
            <textarea value={form.out_of_hours_message} onChange={(event) => handleChange('out_of_hours_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
            Mensagem de despedida
            <textarea value={form.farewell_message} onChange={(event) => handleChange('farewell_message', event.target.value)} rows={2} className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          </label>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.use_markdown} onChange={(event) => handleChange('use_markdown', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Permitir Markdown
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.use_emojis} onChange={(event) => handleChange('use_emojis', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Permitir emojis
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.analyze_images} onChange={(event) => handleChange('analyze_images', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Analisar imagens recebidas
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.allow_audio_messages} onChange={(event) => handleChange('allow_audio_messages', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Permitir áudios de clientes
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.bot_enabled} onChange={(event) => handleChange('bot_enabled', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Bot ativo
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.knowledge_only} onChange={(event) => handleChange('knowledge_only', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Responder apenas com informações dos arquivos
          </label>
          <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
            <input type="checkbox" checked={form.prompt_injection_protection} onChange={(event) => handleChange('prompt_injection_protection', event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
            Bloquear prompt injection
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Automação</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Regras de encaminhamento</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <input value={newRule.name} onChange={(event) => setNewRule((current) => ({ ...current, name: event.target.value }))} placeholder="Nome da regra" className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          <select value={newRule.trigger_type} onChange={(event) => setNewRule((current) => ({ ...current, trigger_type: event.target.value as AutomationRuleInput['trigger_type'] }))} className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500">
            <option value="cliente_bravo">Cliente bravo</option>
            <option value="valor_alto">Valor alto</option>
            <option value="palavra_especifica">Palavra específica</option>
            <option value="financeiro">Financeiro</option>
            <option value="advogado">Advogado</option>
            <option value="fila_humana">Fila humana</option>
          </select>
          <input value={newRule.trigger_value} onChange={(event) => setNewRule((current) => ({ ...current, trigger_value: event.target.value }))} placeholder="Palavra ou valor" className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          <input value={newRule.department} onChange={(event) => setNewRule((current) => ({ ...current, department: event.target.value }))} placeholder="Departamento" className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />
          <button type="button" onClick={saveRule} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
            <Plus size={16} />
            Criar
          </button>
        </div>
        <textarea value={newRule.response_message} onChange={(event) => setNewRule((current) => ({ ...current, response_message: event.target.value }))} rows={2} placeholder="Mensagem enviada quando a regra disparar" className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none focus:border-slate-500" />

        <div className="mt-5 grid gap-3">
          {automationRules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
              Nenhuma regra criada ainda.
            </div>
          ) : automationRules.map((rule) => (
            <div key={rule.id} className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-white">{rule.name}</p>
                <p className="mt-1 text-xs text-slate-500">{rule.trigger_type} {rule.trigger_value ? `- ${rule.trigger_value}` : ''}</p>
              </div>
              <input value={rule.department} onChange={(event) => void patchRule(rule.id, { department: event.target.value })} placeholder="Departamento" className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-500" />
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={rule.active} onChange={(event) => void patchRule(rule.id, { active: event.target.checked })} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500" />
                Ativa
              </label>
              <button type="button" onClick={() => void removeRule(rule.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-slate-300 transition hover:border-red-400 hover:text-red-300" aria-label="Remover regra">
                <Trash2 size={16} />
              </button>
              {rule.response_message && <p className="text-sm leading-6 text-slate-400 lg:col-span-4">{rule.response_message}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300 sm:rounded-3xl sm:p-6">
        <p className="font-semibold text-white">Nota</p>
        <p className="mt-2 leading-6">Segredos como OPENAI_API_KEY, WHATSAPP_TOKEN e APP_SECRET não aparecem aqui. Estas informações ficam com o administrador.</p>
      </div>
    </div>
  );
}
