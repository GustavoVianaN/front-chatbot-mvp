'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { analyzeCompanyIntake, createAutomationRule, createKnowledge, createKnowledgeFile, deleteAutomationRule, disconnectWhatsappWeb, getAutomationRules, getBotConfig, getConversations, getDashboard, getIntegrationConnections, getKnowledge, getKnowledgeFiles, getKnowledgeSources, getKnowledgeStatus, getProductItems, getSettings, getWhatsappDisconnectEvents, getWhatsappStatus, logout, replyToConversation, startWhatsappWeb, updateAutomationRule, updateBotConfig, updateConversationBot, updateConversationStatus, updateSettings } from '@/lib/api';
import type { AutomationRule, BotConfig, CompanyIntakeFile, Conversation, IntegrationConnection, KnowledgeFile, KnowledgeItem, KnowledgeSource, KnowledgeStatus, ProductItem, Settings, WhatsAppDisconnectEvent, WhatsAppStatus } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import MetricCard from '@/components/MetricCard';
import ConversationList from '@/components/ConversationList';
import ConversationPanel from '@/components/ConversationPanel';
import ContactDetails from '@/components/ContactDetails';
import BotConfigPanel from '@/components/BotConfigPanel';
import KnowledgeEditor from '@/components/KnowledgeEditor';
import WhatsAppStatusPanel from '@/components/WhatsAppStatusPanel';
import SettingsPanel from '@/components/SettingsPanel';
import BellaAssistant from '@/components/BellaAssistant';
import { toast } from '@/components/Toast';

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bot-config', label: 'Configurar Bot', icon: Sparkles },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon },
] as const;

type SectionId = (typeof sections)[number]['id'];
type BotConfigTab = 'simulation' | 'config' | 'knowledge';
type WhatsappTab = 'status' | 'conversations';
type ThemeMode = 'dark' | 'light';
type OnboardingMode = 'hidden' | 'welcome' | 'wizard' | 'finishing' | 'ready';
type CompanyIntakeDraftFile = {
  id: string;
  file: File;
  content_description: string;
};

const companyIntakeFileTypes = new Set([
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
const companyIntakeFileExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|png|jpe?g|webp|gif)$/i;
const maxCompanyIntakeFileBytes = 5 * 1024 * 1024;
const onboardingStorageKey = 'bella-ai-onboarding-completed';
const onboardingTotalSteps = 5;
const toneOptions = ['Formal', 'Amigável', 'Vendas', 'Suporte', 'Jurídico', 'Médico', 'Financeiro'];
const contextProcessingItems = [
  'Identificando segmento',
  'Produtos',
  'Serviços',
  'Horários',
  'Diferenciais',
  'Público',
  'Linguagem',
];
const finishingItems = ['Configurando IA', 'Criando empresa', 'Gerando prompt', 'Tudo pronto'];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function mimeTypeForFile(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
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

  return extension ? byExtension[extension] || 'application/octet-stream' : 'application/octet-stream';
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildLiveUnderstanding(text: string, files: CompanyIntakeDraftFile[], draft: { company_name: string; segment: string }) {
  const items: string[] = [];
  const normalized = text.trim();

  if (draft.segment.trim()) {
    items.push(`Empresa de ${draft.segment.trim().toLowerCase()}.`);
  }

  const lines = normalized
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim().replace(/[.!?]+$/, ''))
    .filter((line) => line.length > 8);

  for (const line of lines.slice(0, 4)) {
    items.push(`${line}.`);
  }

  if (files.length > 0) {
    items.push(`${files.length} arquivo${files.length > 1 ? 's' : ''} enviado${files.length > 1 ? 's' : ''} como base de conhecimento.`);
  }

  if (items.length === 0 && draft.company_name.trim()) {
    items.push(`Empresa ${draft.company_name.trim()} em configuração.`);
  }

  return Array.from(new Set(items)).slice(0, 6);
}

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [botConfigTab, setBotConfigTab] = useState<BotConfigTab>('simulation');
  const [whatsappTab, setWhatsappTab] = useState<WhatsappTab>('status');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [knowledgeStatus, setKnowledgeStatus] = useState<KnowledgeStatus | null>(null);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [disconnectEvents, setDisconnectEvents] = useState<WhatsAppDisconnectEvent[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pending, setPending] = useState(false);
  const [companyIntakeText, setCompanyIntakeText] = useState('');
  const [companyIntakeFiles, setCompanyIntakeFiles] = useState<CompanyIntakeDraftFile[]>([]);
  const [companyIntakeError, setCompanyIntakeError] = useState('');
  const [companyIntakeSummary, setCompanyIntakeSummary] = useState('');
  const [analyzingCompanyIntake, setAnalyzingCompanyIntake] = useState(false);
  const [savingCompanyIntake, setSavingCompanyIntake] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('hidden');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [finishingProgress, setFinishingProgress] = useState(0);
  const [tonePromptOpen, setTonePromptOpen] = useState(false);
  const [knowledgeReviewOpen, setKnowledgeReviewOpen] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState({
    company_name: '',
    segment: '',
    assistant_name: 'Bella',
    tone: '',
    response_length: 'média' as BotConfig['response_length'],
  });

  const loadPanel = async () => {
    try {
      setPending(true);
      const [dashboardData, convos, config, knowledgeData, knowledgeFilesData, knowledgeSourcesData, knowledgeStatusData, productItemsData, integrationData, rulesData, whatsappEvents, whatsapp, settingsData] = await Promise.all([
        getDashboard(),
        getConversations(),
        getBotConfig(),
        getKnowledge(),
        getKnowledgeFiles(),
        getKnowledgeSources(),
        getKnowledgeStatus(),
        getProductItems(),
        getIntegrationConnections(),
        getAutomationRules(),
        getWhatsappDisconnectEvents(),
        getWhatsappStatus(),
        getSettings(),
      ]);
      setDashboard(dashboardData);
      setConversations(convos);
      setSelectedConversationId(convos[0]?.id ?? null);
      setBotConfig(config);
      setKnowledge(knowledgeData);
      setKnowledgeFiles(knowledgeFilesData);
      setKnowledgeSources(knowledgeSourcesData);
      setKnowledgeStatus(knowledgeStatusData);
      setProductItems(productItemsData);
      setIntegrations(integrationData);
      setAutomationRules(rulesData);
      setDisconnectEvents(whatsappEvents);
      setWhatsappStatus(whatsapp);
      setSettings(settingsData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o painel.';

      toast(message);

      if (message.includes('Sessão expirada')) {
        await logout();
        window.location.href = '/login';
      }
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    loadPanel();
  }, []);

  useEffect(() => {
    if (!dashboard || !botConfig) return;

    setOnboardingDraft((current) => ({
      company_name: current.company_name || botConfig.company_name || settings?.company_name || '',
      segment: current.segment || botConfig.segment || '',
      assistant_name: current.assistant_name || botConfig.assistant_name || 'Bella',
      tone: current.tone || botConfig.tone || '',
      response_length: current.response_length || botConfig.response_length || 'média',
    }));

    if (window.localStorage.getItem(onboardingStorageKey) === 'true') {
      setOnboardingMode('hidden');
    }
  }, [dashboard, botConfig, settings]);

  useEffect(() => {
    if (!whatsappStatus) return;

    const fastPolling = activeSection === 'whatsapp'
      && whatsappTab === 'status'
      && (whatsappStatus.web.status === 'connecting' || whatsappStatus.web.status === 'qr_pending');

    const interval = window.setInterval(async () => {
      const status = await getWhatsappStatus();
      setWhatsappStatus(status);
    }, fastPolling ? 4000 : 30000);

    return () => window.clearInterval(interval);
  }, [activeSection, whatsappStatus, whatsappTab]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('panel-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    window.localStorage.setItem('panel-theme', theme);
  }, [theme]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? conversations[0] ?? null,
    [conversations, selectedConversationId]
  );
  const companyName = botConfig?.company_name || settings?.company_name || selectedConversation?.company?.name || 'Painel de Atendimento';
  const whatsappConnected = Boolean(whatsappStatus?.connected || whatsappStatus?.web.status === 'connected');
  const liveUnderstanding = buildLiveUnderstanding(companyIntakeText, companyIntakeFiles, onboardingDraft);
  const onboardingKnowledgeWords = wordCount(companyIntakeSummary || companyIntakeText);

  const handleChangeSection = (section: string) => {
    setActiveSection(section as SectionId);
  };

  const handleRefresh = async () => {
    await loadPanel();
    toast('Dados atualizados.');
  };

  const handleCompanyIntakeFileSelect = (selectedFiles: FileList | null) => {
    setCompanyIntakeError('');
    const nextFiles = Array.from(selectedFiles || []);

    if (nextFiles.length === 0) return;

    const invalidType = nextFiles.find((file) => {
      const mimeType = mimeTypeForFile(file);
      return !companyIntakeFileTypes.has(mimeType) && !companyIntakeFileExtensions.test(file.name);
    });

    if (invalidType) {
      setCompanyIntakeError('Envie imagem, PDF, Word, Excel, PowerPoint, CSV ou TXT.');
      return;
    }

    const oversizedFile = nextFiles.find((file) => file.size > maxCompanyIntakeFileBytes);

    if (oversizedFile) {
      setCompanyIntakeError('Cada arquivo pode ter no máximo 5MB.');
      return;
    }

    setCompanyIntakeFiles((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        content_description: '',
      })),
    ].slice(0, 10));
  };

  const handleAnalyzeCompanyIntake = async () => {
    if ((!companyIntakeText.trim() && companyIntakeFiles.length === 0) || analyzingCompanyIntake) return;
    setCompanyIntakeError('');
    setAnalyzingCompanyIntake(true);

    try {
      const files: CompanyIntakeFile[] = await Promise.all(companyIntakeFiles.map(async (item) => ({
        original_filename: item.file.name,
        mime_type: mimeTypeForFile(item.file),
        size_bytes: item.file.size,
        data_url: await readFileAsDataUrl(item.file),
        content_description: item.content_description.trim(),
      })));
      const result = await analyzeCompanyIntake({
        company_text: companyIntakeText.trim(),
        files,
      });
      setCompanyIntakeSummary(result.summary);
    } catch (error) {
      setCompanyIntakeError(error instanceof Error ? error.message : 'Não foi possível analisar as informações da empresa.');
    } finally {
      setAnalyzingCompanyIntake(false);
    }
  };

  const handleSaveCompanyIntake = async () => {
    if ((!companyIntakeSummary.trim() && companyIntakeFiles.length === 0) || savingCompanyIntake) return;
    setCompanyIntakeError('');
    setSavingCompanyIntake(true);

    try {
      if (companyIntakeSummary.trim()) {
        const createdKnowledge = await createKnowledge({
          title: 'Leitura inicial da empresa',
          category: 'Geral',
          content: [
            companyIntakeSummary.trim(),
            companyIntakeText.trim() ? `\nTexto original informado pela empresa:\n${companyIntakeText.trim()}` : '',
          ].filter(Boolean).join('\n'),
          active: true,
        });
        setKnowledge((current) => [createdKnowledge, ...current]);
      }

      const createdFiles = await Promise.all(companyIntakeFiles.map(async (item) => createKnowledgeFile({
        title: item.file.name.replace(/\.[^.]+$/, ''),
        description: 'Arquivo enviado no onboarding da empresa.',
        content_description: item.content_description.trim(),
        extracted_text: '',
        original_filename: item.file.name,
        mime_type: mimeTypeForFile(item.file),
        size_bytes: item.file.size,
        data_url: await readFileAsDataUrl(item.file),
        active: true,
      })));

      if (createdFiles.length > 0) {
        setKnowledgeFiles((current) => [...createdFiles.reverse(), ...current]);
      }

      setCompanyIntakeText('');
      setCompanyIntakeFiles([]);
      setCompanyIntakeSummary('');
      toast('Onboarding salvo na base do bot.');
    } catch (error) {
      setCompanyIntakeError(error instanceof Error ? error.message : 'Não foi possível salvar o onboarding na base do bot.');
    } finally {
      setSavingCompanyIntake(false);
    }
  };

  const updateOnboardingDraft = <Key extends keyof typeof onboardingDraft>(field: Key, value: (typeof onboardingDraft)[Key]) => {
    setOnboardingDraft((current) => ({ ...current, [field]: value }));
  };

  const onboardingStepIsValid = () => {
    if (onboardingStep === 1) {
      return Boolean(onboardingDraft.company_name.trim() && onboardingDraft.segment.trim());
    }

    if (onboardingStep === 2) {
      return Boolean(onboardingDraft.assistant_name.trim());
    }

    return true;
  };

  const handleNextOnboardingStep = () => {
    if (!onboardingStepIsValid()) {
      toast('Preencha os campos principais para continuar.');
      return;
    }

    setOnboardingStep((current) => Math.min(onboardingTotalSteps, current + 1));
  };

  const handleFinishOnboarding = async () => {
    if (!botConfig) return;

    setPending(true);
    setFinishingProgress(0);
    setOnboardingMode('finishing');

    try {
      await wait(450);
      setFinishingProgress(1);

      const updated = await updateBotConfig({
        ...botConfig,
        assistant_name: onboardingDraft.assistant_name.trim() || botConfig.assistant_name,
        company_name: onboardingDraft.company_name.trim() || botConfig.company_name,
        segment: onboardingDraft.segment.trim() || botConfig.segment,
        tone: onboardingDraft.tone.trim() || botConfig.tone,
        response_length: onboardingDraft.response_length,
        company_description: companyIntakeText.trim() || companyIntakeSummary.trim() || botConfig.company_description,
      });

      setBotConfig(updated);
      setFinishingProgress(2);

      if (companyIntakeSummary.trim() || companyIntakeFiles.length > 0) {
        await handleSaveCompanyIntake();
      }

      await wait(650);
      setFinishingProgress(3);
      await wait(650);
      window.localStorage.setItem(onboardingStorageKey, 'true');
      setOnboardingMode('ready');
      setOnboardingStep(1);
    } catch (error) {
      setOnboardingMode('wizard');
      toast(error instanceof Error ? error.message : 'Não foi possível concluir os primeiros passos.');
    } finally {
      setPending(false);
    }
  };

  const handleGoToWhatsAppSetup = () => {
    window.localStorage.setItem(onboardingStorageKey, 'true');
    setOnboardingMode('hidden');
    setActiveSection('whatsapp');
    setWhatsappTab('status');
  };

  const handleToggleTheme = () => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  };

  const refreshWhatsappStatus = async () => {
    try {
      const [status, events] = await Promise.all([getWhatsappStatus(), getWhatsappDisconnectEvents()]);
      setWhatsappStatus(status);
      setDisconnectEvents(events);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o status do WhatsApp.';
      toast(message);
      throw error;
    }
  };

  const handleStartWhatsappWeb = async () => {
    setPending(true);
    try {
      await startWhatsappWeb();
      await refreshWhatsappStatus();
      toast('QR Code do WhatsApp Web gerado.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível iniciar o WhatsApp Web.');
    } finally {
      setPending(false);
    }
  };

  const handleDisconnectWhatsappWeb = async () => {
    setPending(true);
    try {
      await disconnectWhatsappWeb();
      await refreshWhatsappStatus();
      toast('WhatsApp Web desconectado.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível desconectar o WhatsApp Web.');
    } finally {
      setPending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setDashboard(null);
    setConversations([]);
    setSelectedConversationId(null);
    setBotConfig(null);
    setKnowledge([]);
    setKnowledgeFiles([]);
    setKnowledgeSources([]);
    setKnowledgeStatus(null);
    setProductItems([]);
    setIntegrations([]);
    setWhatsappStatus(null);
    setSettings(null);
    window.location.href = '/login';
  };

  const onboardingProgress = `${Math.round((onboardingStep / onboardingTotalSteps) * 100)}%`;

  if (onboardingMode !== 'hidden' && dashboard && botConfig) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
        {onboardingMode === 'finishing' ? (
          <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center justify-center">
            <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 text-center shadow-2xl sm:rounded-3xl sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/40">
                <Sparkles size={30} />
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">Configurando IA...</h1>
              <div className="mx-auto mt-8 max-w-md space-y-3 text-left">
                {finishingItems.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <CheckCircle2 size={18} className={index <= finishingProgress ? 'text-emerald-300' : 'text-slate-600'} />
                    <span className={index <= finishingProgress ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-500'}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : onboardingMode === 'ready' ? (
          <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center justify-center">
            <div className="w-full rounded-2xl border border-emerald-500/20 bg-slate-900/95 p-6 text-center shadow-2xl sm:rounded-3xl sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/40">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="mt-6 text-3xl font-semibold text-white">Sua IA está pronta.</h1>
              <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-400">
                Agora conecte seu WhatsApp para começar a atender clientes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleGoToWhatsAppSetup}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Conectar WhatsApp
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingMode('hidden')}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Ir para Dashboard
                </button>
              </div>
            </div>
          </section>
        ) : onboardingMode === 'welcome' ? (
          <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
            <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl sm:rounded-3xl">
              <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="flex flex-col justify-between border-b border-slate-800 bg-slate-950 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/40">
                      <Sparkles size={26} />
                    </div>
                    <p className="mt-8 text-xs uppercase tracking-[0.22em] text-emerald-300">Configuração inicial</p>
                    <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                      Configure seu assistente de IA em menos de 2 minutos.👋
                    </h1>
                    <p className="mt-4 max-w-lg text-base leading-7 text-slate-400">
                      Ele estará pronto para responder seus clientes no WhatsApp automaticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingStep(1);
                      setOnboardingMode('wizard');
                    }}
                    className="mt-10 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-emerald-500 sm:w-auto"
                  >
                    Começar
                    <ArrowRight size={20} />
                  </button>
                </div>

                <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
                  {[
                    ['01', 'Empresa', 'Nome, segmento e contexto básico.'],
                    ['02', 'Assistente', 'Escolha como a IA vai se apresentar.'],
                    ['03', 'Conhecimento', 'Ensine sua IA sobre a empresa.'],
                    ['04', 'Atendimento', 'Defina estilo e tamanho das respostas.'],
                    ['05', 'Pronto', 'Revise e entre no painel.'],
                  ].map(([number, title, description]) => (
                    <div key={number} className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-emerald-300">
                        {number}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
            <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl sm:rounded-3xl">
              <div className="border-b border-slate-800 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Passo {onboardingStep} de {onboardingTotalSteps}</p>
                    <h1 className="mt-2 text-2xl font-semibold text-white">
                      {onboardingStep === 1 && 'Empresa'}
                      {onboardingStep === 2 && 'Nome do assistente'}
                      {onboardingStep === 3 && 'Ensine sua IA sobre sua empresa'}
                      {onboardingStep === 4 && 'Estilo de atendimento'}
                      {onboardingStep === 5 && 'Revisão final'}
                    </h1>
                    {onboardingStep === 2 && (
                      <p className="mt-2 text-sm leading-6 text-slate-400">Esse será o nome que aparecerá para seus clientes.</p>
                    )}
                    {onboardingStep === 3 && (
                      <p className="mt-2 text-sm leading-6 text-slate-400">Quanto mais contexto você fornecer, melhores serão as respostas.</p>
                    )}
                  </div>
                  <div className="min-w-[180px]">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: onboardingProgress }} />
                    </div>
                    <p className="mt-2 text-right text-xs text-slate-500">{onboardingProgress}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {onboardingStep === 1 && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <label className="space-y-2 text-sm font-medium text-slate-300">
                      Nome da empresa
                      <input
                        value={onboardingDraft.company_name}
                        onChange={(event) => updateOnboardingDraft('company_name', event.target.value)}
                        placeholder="Bella Pizzaria"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-300">
                      Segmento
                      <input
                        value={onboardingDraft.segment}
                        onChange={(event) => updateOnboardingDraft('segment', event.target.value)}
                        placeholder="Restaurante"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </label>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {['Bella', 'Ana', 'Atendente'].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => updateOnboardingDraft('assistant_name', name)}
                          className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${onboardingDraft.assistant_name === name ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500 hover:text-white'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    <label className="space-y-2 text-sm font-medium text-slate-300">
                      Ou digite outro nome
                      <input
                        value={onboardingDraft.assistant_name}
                        onChange={(event) => updateOnboardingDraft('assistant_name', event.target.value)}
                        placeholder="Ex: Sofia, Lucas, Recepção"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </label>
                  </div>
                )}

                {onboardingStep === 3 && (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                    <div className="space-y-4">
                      <label className="space-y-2 text-sm font-medium text-slate-300">
                        O que sua empresa faz?
                        <textarea
                          value={companyIntakeText}
                          onChange={(event) => setCompanyIntakeText(event.target.value)}
                          rows={8}
                          placeholder={`Ex:\nVendemos capinhas personalizadas para celular.\nProduzimos sob encomenda.\nEntregamos em todo o Brasil.\nNosso prazo médio é de 3 dias.`}
                          className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-400"
                        />
                      </label>

                      <div className="flex flex-col gap-3">
                        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
                          <Paperclip size={16} />
                          Adicionar arquivos
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,text/csv,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={(event) => handleCompanyIntakeFileSelect(event.target.files)}
                            className="hidden"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['PDF', 'DOCX', 'TXT', 'XLSX', 'CSV'].map((format) => (
                            <span key={format} className="rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs font-semibold text-slate-400">{format}</span>
                          ))}
                          <span className="px-2 py-1 text-xs text-slate-500">Até 10 arquivos, 5MB cada.</span>
                        </div>
                      </div>

                      {companyIntakeFiles.length > 0 && (
                        <div className="grid gap-3">
                          {companyIntakeFiles.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-400">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-white">{item.file.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">{formatFileSize(item.file.size)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCompanyIntakeFiles((current) => current.filter((file) => file.id !== item.id))}
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
                                  aria-label="Remover arquivo"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <label className="mt-3 block space-y-2 text-sm text-slate-300">
                                O que esse arquivo representa?
                                <input
                                  value={item.content_description}
                                  onChange={(event) => setCompanyIntakeFiles((current) => current.map((file) => file.id === item.id ? { ...file, content_description: event.target.value } : file))}
                                  placeholder="Ex: Esse PDF tem o cardápio e preços."
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {companyIntakeError && <p className="text-sm text-rose-300">{companyIntakeError}</p>}

                      <button
                        type="button"
                        onClick={handleAnalyzeCompanyIntake}
                        disabled={(!companyIntakeText.trim() && companyIntakeFiles.length === 0) || analyzingCompanyIntake}
                        className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
                      >
                        <Sparkles size={16} />
                        {analyzingCompanyIntake ? 'Processando...' : 'Gerar contexto'}
                      </button>
                    </div>

                    <aside className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resultado</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">O que a IA entendeu</h3>
                      {analyzingCompanyIntake ? (
                        <div className="mt-4 space-y-3">
                          <div className="text-2xl">🧠</div>
                          <p className="text-sm font-semibold text-white">Lendo empresa...</p>
                          {contextProcessingItems.map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                              <CheckCircle2 size={15} className="text-emerald-300" />
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : companyIntakeSummary ? (
                        <p className="mt-4 max-h-[360px] overflow-y-auto whitespace-pre-line text-sm leading-6 text-slate-300">{companyIntakeSummary}</p>
                      ) : liveUnderstanding.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {liveUnderstanding.map((item) => (
                            <div key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
                              <CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-300" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-slate-500">
                          Enquanto você digita, a IA organiza os principais pontos aqui.
                        </p>
                      )}
                    </aside>
                  </div>
                )}

                {onboardingStep === 4 && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {toneOptions.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => updateOnboardingDraft('tone', tone)}
                          className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${onboardingDraft.tone === tone ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500 hover:text-white'}`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTonePromptOpen((current) => !current)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                    >
                      Editar prompt
                    </button>
                    {tonePromptOpen && (
                      <label className="block space-y-2 text-sm font-medium text-slate-300">
                        Prompt de tom personalizado
                        <input
                          value={onboardingDraft.tone}
                          onChange={(event) => updateOnboardingDraft('tone', event.target.value)}
                          placeholder="Ex: simpático, direto, profissional e acolhedor"
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                        />
                      </label>
                    )}
                    <div>
                      <p className="mb-3 text-sm font-semibold text-white">Tamanho da resposta</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(['curta', 'média', 'detalhada'] as BotConfig['response_length'][]).map((length) => (
                        <button
                          key={length}
                          type="button"
                          onClick={() => updateOnboardingDraft('response_length', length)}
                          className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition ${onboardingDraft.response_length === length ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500 hover:text-white'}`}
                        >
                          {length}
                        </button>
                      ))}
                    </div>
                    </div>
                  </div>
                )}

                {onboardingStep === 5 && (
                  <div className="mx-auto max-w-2xl space-y-4">
                    {[
                      ['Empresa', onboardingDraft.company_name || 'Não informado'],
                      ['Segmento', onboardingDraft.segment || 'Não informado'],
                      ['Assistente', onboardingDraft.assistant_name || 'Bella'],
                      ['Tom', onboardingDraft.tone || 'Padrão da Bella'],
                      ['Resposta', onboardingDraft.response_length],
                      ['Conhecimento', `${onboardingKnowledgeWords} palavras · ${companyIntakeFiles.length} arquivo${companyIntakeFiles.length === 1 ? '' : 's'} enviado${companyIntakeFiles.length === 1 ? '' : 's'}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <span className="text-sm text-slate-500">{label}</span>
                        <span className="text-right text-sm font-semibold text-white">{value}</span>
                      </div>
                    ))}

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">Conhecimento entendido pela IA</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Revise e ajuste qualquer informação que não ficou certa.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKnowledgeReviewOpen((current) => !current)}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                        >
                          {knowledgeReviewOpen ? 'Fechar edição' : 'Editar informação'}
                        </button>
                      </div>

                      {knowledgeReviewOpen ? (
                        <textarea
                          value={companyIntakeSummary || companyIntakeText}
                          onChange={(event) => {
                            if (companyIntakeSummary) {
                              setCompanyIntakeSummary(event.target.value);
                            } else {
                              setCompanyIntakeText(event.target.value);
                            }
                          }}
                          rows={7}
                          placeholder="Ajuste aqui o contexto que será usado pela IA."
                          className="mt-4 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-400"
                        />
                      ) : (
                        <p className="mt-4 max-h-48 overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-6 text-slate-300">
                          {companyIntakeSummary || companyIntakeText || 'Nenhum contexto informado ainda.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <button
                  type="button"
                  onClick={() => onboardingStep === 1 ? setOnboardingMode('welcome') : setOnboardingStep((current) => Math.max(1, current - 1))}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Voltar
                </button>
                {onboardingStep < onboardingTotalSteps ? (
                  <button
                    type="button"
                    onClick={handleNextOnboardingStep}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Continuar
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishOnboarding}
                    disabled={pending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    <CheckCircle2 size={16} />
                    {pending ? 'Finalizando...' : 'Finalizar configuração'}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 pb-24 text-slate-100 lg:pb-0">
      <div className="fixed inset-y-0 left-0 hidden w-80 border-r border-slate-800 bg-slate-950/98 backdrop-blur-xl lg:block xl:w-72">
        <Sidebar sections={sections} activeSection={activeSection} onChange={handleChangeSection} companyName={companyName} />
      </div>
      <main className="min-h-screen lg:ml-80 xl:ml-72">
        <Topbar companyName={companyName} userName="Admin" status={!whatsappConnected ? 'Indisponível' : dashboard?.botEnabled ? 'Ativo' : 'Pausado'} whatsappConnected={whatsappConnected ? 'Conectado' : 'Não conectado'} onLogout={handleLogout} theme={theme} onToggleTheme={handleToggleTheme} />
        <div className="px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
          {pending && (
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-300">
              Carregando dados...
            </div>
          )}

          {activeSection === 'dashboard' && dashboard && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm">Visão geral</p>
                  <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Dashboard operacional</h1>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                  <button type="button" onClick={handleRefresh} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 sm:px-4">
                    <RefreshCw size={16} /> Atualizar
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Mensagens hoje" value={dashboard.todayMessages.toString()} />
                <MetricCard label="Respostas IA" value={dashboard.iaResponses.toString()} />
                <MetricCard label="Conversas abertas" value={dashboard.openConversations.toString()} />
                <MetricCard label="Conversas resolvidas" value={dashboard.resolvedConversations.toString()} />
              </div>

              <div className="grid gap-4 xl:gap-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm">Atividade recente</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-4">
                      <p className="text-sm text-slate-400">Última atividade registrada</p>
                      <p className="mt-2 text-sm font-medium text-slate-100">{dashboard.lastMessage}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/80 shadow-panel sm:rounded-3xl">
                <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-300">
                      <Building2 size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 sm:text-sm">Primeiros passos</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">Conte tudo sobre sua empresa</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        Abra a janelinha de onboarding para gerar a primeira leitura da IA e salvar esse contexto na base do bot.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingStep(1);
                      setOnboardingMode('wizard');
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Abrir primeiros passos
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'bot-config' && botConfig && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm sm:tracking-[0.24em]">Configurar Bot</p>
                  <h1 className="mt-1 text-xl font-semibold text-white">Bot e arquivos</h1>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-800 bg-slate-950/90 p-1 sm:w-auto">
                  <button type="button" onClick={() => setBotConfigTab('simulation')} className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${botConfigTab === 'simulation' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'}`}>
                    Simulação
                  </button>
                  <button type="button" onClick={() => setBotConfigTab('config')} className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${botConfigTab === 'config' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'}`}>
                    Configurações
                  </button>
                  <button type="button" onClick={() => setBotConfigTab('knowledge')} className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${botConfigTab === 'knowledge' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'}`}>
                    Arquivos
                  </button>
                </div>
              </div>

              {botConfigTab === 'knowledge' ? (
                <KnowledgeEditor
                  knowledge={knowledge}
                  onChange={setKnowledge}
                  files={knowledgeFiles}
                  onFilesChange={setKnowledgeFiles}
                  sources={knowledgeSources}
                  onSourcesChange={setKnowledgeSources}
                  status={knowledgeStatus}
                  products={productItems}
                  onProductsChange={setProductItems}
                  integrations={integrations}
                  onIntegrationsChange={setIntegrations}
                />
              ) : (
                <BotConfigPanel
                  mode={botConfigTab}
                  botConfig={botConfig}
                  automationRules={automationRules}
                  onAutomationRulesChange={setAutomationRules}
                  onCreateAutomationRule={createAutomationRule}
                  onUpdateAutomationRule={updateAutomationRule}
                  onDeleteAutomationRule={deleteAutomationRule}
                  onSave={async (data) => {
                  setPending(true);
                  const updated = await updateBotConfig(data);
                  setBotConfig(updated);
                  toast('Configurações do bot salvas.');
                  setPending(false);
                }} onRefresh={async () => {
                  const latestConfig = await getBotConfig();
                  setBotConfig(latestConfig);
                  return latestConfig;
                }} />
              )}
            </section>
          )}

          {activeSection === 'whatsapp' && whatsappStatus && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 sm:text-sm sm:tracking-[0.24em]">WhatsApp</p>
                  <h1 className="mt-1 text-xl font-semibold text-white">Integração e conversas</h1>
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-800 bg-slate-950/90 p-1 sm:w-auto">
                  <button type="button" onClick={() => setWhatsappTab('status')} className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${whatsappTab === 'status' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'}`}>
                    Integração
                  </button>
                  <button type="button" onClick={() => setWhatsappTab('conversations')} className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${whatsappTab === 'conversations' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'}`}>
                    Conversas
                  </button>
                </div>
              </div>

              {whatsappTab === 'status' ? (
                <WhatsAppStatusPanel
                  status={whatsappStatus}
                  disconnectEvents={disconnectEvents}
                  loading={pending}
                  onRefresh={refreshWhatsappStatus}
                  onStartWeb={handleStartWhatsappWeb}
                  onDisconnectWeb={handleDisconnectWhatsappWeb}
                />
              ) : (
                <section className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:gap-6">
                  <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-panel sm:rounded-3xl sm:p-4">
                    <ConversationList conversations={conversations} selectedId={selectedConversationId} onSelect={setSelectedConversationId} />
                  </div>
                  <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-panel sm:rounded-3xl sm:p-4">
                    <ConversationPanel conversation={selectedConversation} onReply={async (message) => {
                      if (!selectedConversation) return;
                      setPending(true);
                      const result = await replyToConversation(selectedConversation.id, message);
                      setConversations((current) => current.map((conv) => conv.id === selectedConversation.id ? { ...conv, last_message: message, last_message_at: new Date().toISOString() } : conv));
                      toast('Resposta enviada com sucesso.');
                      setPending(false);
                      return result.message;
                    }} onUpdateStatus={async (status) => {
                      if (!selectedConversation) return;
                      await updateConversationStatus(selectedConversation.id, status);
                      setConversations((current) => current.map((conv) => conv.id === selectedConversation.id ? { ...conv, status } : conv));
                      toast('Status atualizado.');
                    }} onToggleBot={async (enabled) => {
                      if (!selectedConversation) return;
                      await updateConversationBot(selectedConversation.id, enabled);
                      setConversations((current) => current.map((conv) => conv.id === selectedConversation.id ? { ...conv, botEnabled: enabled } : conv));
                      toast(`Bot ${enabled ? 'ativado' : 'desativado'} nesta conversa.`);
                    }} />
                  </div>
                  <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-panel sm:rounded-3xl sm:p-4">
                    <ContactDetails conversation={selectedConversation} />
                  </div>
                </section>
              )}
            </section>
          )}

          {activeSection === 'settings' && settings && (
            <SettingsPanel settings={settings} onSave={async (data) => {
              setPending(true);
              const updated = await updateSettings(data);
              setSettings(updated);
              toast('Configurações salvas.');
              setPending(false);
            }} />
          )}
        </div>
      </main>
      <BellaAssistant />
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleChangeSection(section.id)}
                className={`flex min-w-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Icon size={18} />
                <span className="max-w-full truncate">{section.label.replace('Configurar ', '')}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
