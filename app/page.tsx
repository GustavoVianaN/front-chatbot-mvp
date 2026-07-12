'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  AlertCircle,
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
import { analyzeCompanyIntake, createAutomationRule, createKnowledge, createKnowledgeFile, deleteAutomationRule, disconnectWhatsappWeb, generateCompanyIntakeExample, generateCompanyIntakeFollowUpQuestion, generateCompanyIntakeLearningSummary, getAutomationRules, getBotConfig, getConversations, getCurrentUser, getDashboard, getIntegrationConnections, getKnowledge, getKnowledgeFiles, getKnowledgeSources, getKnowledgeStatus, getProductItems, getSettings, getWhatsappDisconnectEvents, getWhatsappStatus, logout, markOnboardingCompleted, replyToConversation, startWhatsappWeb, updateAutomationRule, updateBotConfig, updateConversationBot, updateConversationStatus, updateSettings } from '@/lib/api';
import type { AuthUser, AutomationRule, BotConfig, CompanyIntakeFile, Conversation, IntegrationConnection, KnowledgeFile, KnowledgeItem, KnowledgeSource, KnowledgeStatus, ProductItem, Settings, WhatsAppDisconnectEvent, WhatsAppStatus } from '@/lib/types';
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
type QualityDestination = {
  section: SectionId;
  tab?: BotConfigTab | WhatsappTab;
  field?: string;
  elementId?: string;
};
type CompanyIntakeDraftFile = {
  id: string;
  file: File;
  content_description: string;
};
type CompanyReadinessItem = {
  id: string;
  label: string;
  value: string;
  ready: boolean;
};
type CompanyGuidedQuestion = {
  id: number;
  question: string;
  importance: 'required' | 'recommended' | 'optional';
  badge: string;
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
const defaultCompanyIntakeExample = `Ex:
Vendemos capinhas personalizadas para celular.
Produzimos sob encomenda.
Entregamos em todo o Brasil.
Nosso prazo médio é de 3 dias.`;
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
const onboardingBellaGuideMessages: Record<number, { title: string; body: string }> = {
  1: {
    title: 'Vamos começar pela empresa: informe o nome e o segmento do negócio.',
    body: 'Isso ajuda a IA a entender sobre quem ela está falando.',
  },
  2: {
    title: 'Agora escolha o nome do assistente.',
    body: 'Esse será o nome que aparecerá para seus clientes durante o atendimento, como Bella, Ana ou Atendente.',
  },
  3: {
    title: 'Agora vou entender melhor sua empresa.',
    body: 'Escreva o básico primeiro. Depois que eu ler, vou te fazer algumas perguntas para preencher os detalhes que mais ajudam no atendimento.',
  },
  4: {
    title: 'Agora defina o jeito de atender.',
    body: 'Escolha o tom da conversa e o tamanho das respostas para combinar com a forma como sua empresa fala com os clientes.',
  },
  5: {
    title: 'Revise antes de finalizar.',
    body: 'Confira se o nome, o tom e o conhecimento ficaram certos. Se algo não estiver bom, você ainda pode voltar e ajustar.',
  },
};
const minimumCompanyGuidedAnswers = 4;
const companyGuidedQuestions: CompanyGuidedQuestion[] = [
  {
    id: 1,
    question: 'Como funciona o atendimento, desde o primeiro contato até a venda ou serviço ser finalizado?',
    importance: 'required',
    badge: 'Obrigatória',
  },
  {
    id: 2,
    question: 'Qual informação você sempre precisa confirmar com o cliente antes de seguir o atendimento?',
    importance: 'required',
    badge: 'Obrigatória',
  },
  {
    id: 3,
    question: 'Em qual parte do atendimento você mais precisa que a IA tenha cuidado?',
    importance: 'required',
    badge: 'Obrigatória',
  },
  {
    id: 4,
    question: 'Quais perguntas seus clientes mais fazem no dia a dia?',
    importance: 'recommended',
    badge: 'Recomendado',
  },
  {
    id: 5,
    question: 'Qual dessas perguntas frequentes precisa de uma resposta exata da IA?',
    importance: 'recommended',
    badge: 'Recomendado',
  },
  {
    id: 6,
    question: 'E qual resposta eu devo dar quando o cliente fizer essa pergunta?',
    importance: 'recommended',
    badge: 'Recomendado',
  },
];

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

function buildAutomaticWelcomeMessage(input: { assistantName: string; companyName: string; segment: string }) {
  const assistantName = input.assistantName.trim() || 'Assistente';
  const companyName = input.companyName.trim() || 'sua empresa';
  const segment = input.segment.trim().toLowerCase();
  const subject = segment ? `sobre ${segment}` : 'com seu atendimento';
  const templates = [
    `Olá! Sou ${assistantName}, IA de atendimento da ${companyName}. Posso ajudar ${subject}, tirar dúvidas e orientar nos próximos passos. Como posso ajudar hoje?`,
    `Oi! Eu sou ${assistantName}, assistente virtual da ${companyName}. Estou aqui para ajudar de forma rápida e clara. O que você precisa hoje?`,
    `Olá! Você está falando com ${assistantName}, IA da ${companyName}. Me conte como posso ajudar no seu atendimento de hoje.`,
    `Bem-vindo(a) à ${companyName}! Sou ${assistantName}, a IA de atendimento. Posso ajudar com informações, dúvidas e próximos passos. Como posso ajudar?`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
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

function firstMatchingSentence(text: string, matcher: RegExp) {
  const sentence = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .find((item) => matcher.test(item));

  if (!sentence) return '';
  return sentence.length > 92 ? `${sentence.slice(0, 89).trim()}...` : sentence;
}

function summaryField(summary: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = summary.match(new RegExp(`^\\s*${escapedLabel}\\s*:\\s*(.+)$`, 'im'));
  const value = match?.[1]?.trim().replace(/\s+/g, ' ') || '';

  if (!value || /^n[aã]o informado/i.test(value)) return '';
  return value;
}

function guidedQuestionAnsweredInText(text: string, questionId: number) {
  return new RegExp(`Pergunta\\s+${questionId}\\s*:`, 'i').test(text);
}

function buildCompanyReadinessChecklist({
  draft,
  files,
  summary,
  text,
}: {
  draft: { company_name: string; segment: string; tone: string };
  files: CompanyIntakeDraftFile[];
  summary: string;
  text: string;
}): CompanyReadinessItem[] {
  const evidence = [text, summary, ...files.map((item) => item.content_description)]
    .join('\n')
    .trim();
  const hoursMatcher = /\b(hor[aá]rio|atendimento|segunda|ter[cç]a|quarta|quinta|sexta|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom|24h|das\s+\d{1,2}|[aà]s\s+\d{1,2}|\d{1,2}\s?h|\d{1,2}:\d{2})\b/i;
  const productsMatcher = /\b(produto|servi[cç]o|capinha|capa|acess[oó]rio|personalizad|vendemos|vende|fabrica|produz|entrega|troca|pedido)\b/i;
  const companyDoesReady = wordCount(evidence) >= 10;
  const summaryCompanyName = summaryField(summary, 'Nome da empresa');
  const summarySegment = summaryField(summary, 'Segmento');
  const summaryCompanyDescription = summaryField(summary, 'O que a empresa faz');
  const summaryHours = summaryField(summary, 'Horário de atendimento');
  const summaryProducts = summaryField(summary, 'Produtos/serviços');
  const companyDescriptionValue = summaryCompanyDescription || (companyDoesReady ? firstMatchingSentence(evidence, /.+/i) || 'Informado' : '');
  const hoursValue = summaryHours || firstMatchingSentence(text, hoursMatcher);
  const productsValue = summaryProducts || firstMatchingSentence(text, productsMatcher);

  return [
    {
      id: 'company_name',
      label: 'Nome da empresa',
      value: summaryCompanyName || draft.company_name.trim() || 'Não informado',
      ready: Boolean(summaryCompanyName || draft.company_name.trim()),
    },
    {
      id: 'segment',
      label: 'Segmento',
      value: summarySegment || draft.segment.trim() || 'Não informado',
      ready: Boolean(summarySegment || draft.segment.trim()),
    },
    {
      id: 'company_description',
      label: 'O que a empresa faz',
      value: companyDescriptionValue || 'Não informado',
      ready: Boolean(companyDescriptionValue),
    },
    {
      id: 'hours',
      label: 'Horário de atendimento',
      value: hoursValue || 'Não informado',
      ready: Boolean(hoursValue),
    },
    {
      id: 'products',
      label: 'Produtos/serviços',
      value: productsValue || 'Não informado',
      ready: Boolean(productsValue),
    }
  ];
}

function TypewriterText({
  text,
  speed = 35,
  className = '',
  onComplete,
}: {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState('');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayed('');

    let index = 0;

    const interval = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [text, speed]);

  return <p className={className}>{displayed}</p>;
}
export default function Home() {
  const [showSecondBellaText, setShowSecondBellaText] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [botConfigTab, setBotConfigTab] = useState<BotConfigTab>('simulation');
  const [whatsappTab, setWhatsappTab] = useState<WhatsappTab>('status');
  const [botConfigFocusField, setBotConfigFocusField] = useState<string | null>(null);
  const [pendingScrollElementId, setPendingScrollElementId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
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
  const [companyIntakeExample, setCompanyIntakeExample] = useState(defaultCompanyIntakeExample);
  const [generatingCompanyIntakeExample, setGeneratingCompanyIntakeExample] = useState(false);
  const [companyIntakeExampleKey, setCompanyIntakeExampleKey] = useState('');
  const [companyGuidedAnswer, setCompanyGuidedAnswer] = useState('');
  const [companyGuidedAnswers, setCompanyGuidedAnswers] = useState<Record<number, string>>({});
  const [companyGuidedQuestionOverrides, setCompanyGuidedQuestionOverrides] = useState<Record<number, string>>({});
  const [generatingCompanyGuidedQuestion, setGeneratingCompanyGuidedQuestion] = useState(false);
  const [companyGuidedQuestionsUnlocked, setCompanyGuidedQuestionsUnlocked] = useState(false);
  const [companyGuidedLearningSummary, setCompanyGuidedLearningSummary] = useState('');
  const [companyGuidedLearningSummaryKey, setCompanyGuidedLearningSummaryKey] = useState('');
  const [generatingCompanyGuidedLearningSummary, setGeneratingCompanyGuidedLearningSummary] = useState(false);
  const [companyReadinessWarningOpen, setCompanyReadinessWarningOpen] = useState(false);
  const [companyIntakeFiles, setCompanyIntakeFiles] = useState<CompanyIntakeDraftFile[]>([]);
  const [commercialInfoChoice, setCommercialInfoChoice] = useState<'idle' | 'yes' | 'no'>('idle');
  const [commercialInfoText, setCommercialInfoText] = useState('');
  const [commercialInfoLinks, setCommercialInfoLinks] = useState('');
  const [commercialInfoFiles, setCommercialInfoFiles] = useState<CompanyIntakeDraftFile[]>([]);
  const [companyIntakeError, setCompanyIntakeError] = useState('');
  const [companyIntakeSummary, setCompanyIntakeSummary] = useState('');
  const [companyIntakeSummaryKey, setCompanyIntakeSummaryKey] = useState('');
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
    assistant_name: '',
    tone: '',
    response_length: 'média' as BotConfig['response_length'],
  });
  const companyIntakeAutoKeyRef = useRef('');
  const lastAnalyzedCompanyIntakeKeyRef = useRef('');
  const companyGuidedScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (onboardingMode === 'wizard') {
      setShowSecondBellaText(false);
    }
  }, [onboardingMode, onboardingStep]);

  const loadPanel = async () => {
    try {
      setPending(true);
      const [userData, dashboardData, convos, config, knowledgeData, knowledgeFilesData, knowledgeSourcesData, knowledgeStatusData, productItemsData, integrationData, rulesData, whatsappEvents, whatsapp, settingsData] = await Promise.all([
        getCurrentUser(),
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
      setCurrentUser(userData);
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
      assistant_name: current.assistant_name || botConfig.assistant_name || 'Atendente',
      tone: current.tone || botConfig.tone || 'Amigável',
      response_length: current.response_length || botConfig.response_length || 'média',
    }));

    if (currentUser?.onboardingCompleted) {
      setOnboardingMode('hidden');
      return;
    }

    if (currentUser && onboardingMode === 'hidden') {
      setOnboardingStep(1);
      setOnboardingMode('welcome');
    }
  }, [currentUser, currentUser?.onboardingCompleted, dashboard, botConfig, settings, onboardingMode]);

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
  const onboardingBellaGuide = onboardingBellaGuideMessages[onboardingStep] || onboardingBellaGuideMessages[1];
  const companyName = botConfig?.company_name || settings?.company_name || selectedConversation?.company?.name || 'Painel de Atendimento';
  const whatsappConnected = Boolean(whatsappStatus?.connected || whatsappStatus?.web.status === 'connected');
  const onboardingCompleted = Boolean(currentUser?.onboardingCompleted);
  const hasBotConfigValue = (field: keyof BotConfig) => {
    if (!botConfig) return false;

    const value = botConfig[field];

    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    if (typeof value === 'boolean') return value;

    return Boolean(value);
  };
  const countReady = (items: boolean[]) => items.filter(Boolean).length;
  const scoreRatio = (items: boolean[]) => {
    if (items.length === 0) return 0;
    return countReady(items) / items.length;
  };
  const botIdentityFields: (keyof BotConfig)[] = [
    'assistant_name',
    'company_name',
    'company_description',
    'segment',
    'mission',
    'target_audience',
    'address',
    'website',
    'social_links',
  ];
  const botBehaviorFields: (keyof BotConfig)[] = [
    'tone',
    'instructions',
    'welcome_message',
    'fallback_message',
    'out_of_hours_message',
    'farewell_message',
    'language',
    'formality',
    'response_length',
    'message_split_mode',
    'max_wait_seconds',
    'working_days',
  ];
  const botSafetyFields: (keyof BotConfig)[] = [
    'business_scope',
    'guardrails',
    'blocked_topics',
    'handoff_triggers',
    'response_rules',
    'prompt_injection_protection',
    'prompt_injection_patterns',
    'prompt_injection_fallback_message',
    'prompt_leak_patterns',
    'prompt_leak_fallback_message',
    'openai_error_message',
  ];
  const botAdvancedFields: (keyof BotConfig)[] = [
    'knowledge_only_instruction',
    'human_handoff_enabled_instruction',
    'human_handoff_disabled_instruction',
    'resume_conversation_prompt_template',
    'resume_conversation_accepted_message',
    'new_conversation_started_message',
    'system_prompt_template',
    'user_message_template',
  ];
  const botIdentityChecks = botIdentityFields.map(hasBotConfigValue);
  const botBehaviorChecks = botBehaviorFields.map(hasBotConfigValue);
  const botSafetyChecks = botSafetyFields.map(hasBotConfigValue);
  const botAdvancedChecks = botAdvancedFields.map(hasBotConfigValue);
  const knowledgeChecks = [
    hasBotConfigValue('knowledge_base'),
    knowledge.some((item) => item.active && item.content.trim()),
    knowledgeFiles.some((file) => file.active && (file.index_status === 'ready' || file.extracted_text?.trim() || file.content_description?.trim())),
    knowledgeSources.some((source) => source.active && (source.index_status === 'ready' || source.extracted_text?.trim() || source.content_description?.trim())),
    productItems.some((item) => item.active && item.name.trim()),
    knowledge.some((item) => item.active && (item.category === 'FAQ' || /faq|perguntas frequentes|d[uú]vidas/i.test(`${item.title} ${item.content}`))),
    knowledge.some((item) => item.active && /troca|devolu[cç][aã]o|reembolso/i.test(`${item.title} ${item.content}`)) || Boolean(botConfig?.response_rules && /troca|devolu[cç][aã]o|reembolso/i.test(botConfig.response_rules)),
  ];
  const channelChecks = [
    hasBotConfigValue('bot_enabled'),
    whatsappConnected,
    hasBotConfigValue('allow_human_handoff'),
    hasBotConfigValue('use_markdown'),
    hasBotConfigValue('use_emojis'),
    hasBotConfigValue('analyze_images'),
    hasBotConfigValue('allow_audio_messages'),
    hasBotConfigValue('knowledge_only'),
    integrations.some((integration) => integration.active),
    automationRules.some((rule) => rule.active),
  ];
  const assistantQualityGroups = [
    { label: 'Configuração do bot', score: scoreRatio([...botIdentityChecks, ...botBehaviorChecks]), weight: 45, destination: { section: 'bot-config', tab: 'config', field: 'assistant_name' } satisfies QualityDestination },
    { label: 'Conhecimento da empresa', score: scoreRatio(knowledgeChecks), weight: 30, destination: { section: 'bot-config', tab: 'knowledge', elementId: 'knowledge-manual' } satisfies QualityDestination },
    { label: 'Segurança e regras', score: scoreRatio([...botSafetyChecks, ...botAdvancedChecks]), weight: 15, destination: { section: 'bot-config', tab: 'config', field: 'business_scope' } satisfies QualityDestination },
    { label: 'Canais e automações', score: scoreRatio(channelChecks), weight: 10, destination: { section: 'bot-config', tab: 'config', field: 'channel_guide' } satisfies QualityDestination },
  ];
  const assistantQualityItems = [
    {
      label: 'Identidade da empresa',
      ready: scoreRatio(botIdentityChecks) >= 0.8,
      destination: { section: 'bot-config', tab: 'config', field: 'company_name' } satisfies QualityDestination,
    },
    {
      label: 'Tom, idioma e formato',
      ready: scoreRatio(botBehaviorChecks) >= 0.8,
      destination: { section: 'bot-config', tab: 'config', field: 'tone' } satisfies QualityDestination,
    },
    {
      label: 'Mensagens principais',
      ready: ['welcome_message', 'fallback_message', 'out_of_hours_message', 'farewell_message'].every((field) => hasBotConfigValue(field as keyof BotConfig)),
      destination: { section: 'bot-config', tab: 'config', field: 'welcome_message' } satisfies QualityDestination,
    },
    {
      label: 'Escopo e guardrails',
      ready: scoreRatio(botSafetyChecks) >= 0.75,
      destination: { section: 'bot-config', tab: 'config', field: 'business_scope' } satisfies QualityDestination,
    },
    {
      label: 'Base de conhecimento',
      ready: hasBotConfigValue('knowledge_base') || knowledge.some((item) => item.active && item.content.trim()),
      destination: { section: 'bot-config', tab: 'knowledge', elementId: 'knowledge-manual' } satisfies QualityDestination,
    },
    {
      label: 'Arquivos e links',
      ready: knowledgeFiles.some((file) => file.active) || knowledgeSources.some((source) => source.active),
      destination: { section: 'bot-config', tab: 'knowledge', elementId: 'knowledge-files' } satisfies QualityDestination,
    },
    {
      label: 'Produtos e catálogo',
      ready: productItems.some((item) => item.active && item.name.trim()) || knowledgeFiles.some((file) => /\.(csv|xlsx?|pdf)$/i.test(file.original_filename || file.title)) || knowledge.some((item) => /produto|cat[aá]logo|pre[cç]o/i.test(`${item.title} ${item.content}`)),
      destination: { section: 'bot-config', tab: 'knowledge', elementId: 'knowledge-products' } satisfies QualityDestination,
    },
    {
      label: 'FAQ e políticas',
      ready: knowledgeChecks[5] || knowledgeChecks[6],
      destination: { section: 'bot-config', tab: 'config', field: 'response_rules' } satisfies QualityDestination,
    },
    {
      label: 'Canais de mídia',
      ready: Boolean(botConfig?.analyze_images || botConfig?.allow_audio_messages),
      destination: { section: 'bot-config', tab: 'config', field: 'media_channels' } satisfies QualityDestination,
    },
    {
      label: 'WhatsApp conectado',
      ready: whatsappConnected,
      destination: { section: 'whatsapp', tab: 'status' } satisfies QualityDestination,
    },
    {
      label: 'Automações',
      ready: automationRules.some((rule) => rule.active),
      destination: { section: 'bot-config', tab: 'config', field: 'automation_rules' } satisfies QualityDestination,
    },
    {
      label: 'Integrações',
      ready: integrations.some((integration) => integration.active),
      destination: { section: 'bot-config', tab: 'knowledge', elementId: 'knowledge-integrations' } satisfies QualityDestination,
    },
  ];
  const assistantQualityScore = Math.min(100, Math.max(0, Math.round(
    assistantQualityGroups.reduce((total, group) => total + group.score * group.weight, 0)
  )));
  const assistantQualityLabel = assistantQualityScore >= 100
    ? 'Assistente otimizado'
    : assistantQualityScore >= 80
      ? 'Muito bom'
      : assistantQualityScore >= 55
        ? 'Bom'
        : 'Configuração básica';
  const assistantQualityBarClass = assistantQualityScore >= 80 ? 'bg-emerald-500' : assistantQualityScore >= 55 ? 'bg-amber-400' : 'bg-rose-500';
  const liveUnderstanding = buildLiveUnderstanding(companyIntakeText, companyIntakeFiles, onboardingDraft);
  const companyIntakeAutoKey = useMemo(() => JSON.stringify({
    text: companyIntakeText.trim(),
    files: companyIntakeFiles.map((item) => ({
      name: item.file.name,
      size: item.file.size,
      lastModified: item.file.lastModified,
      description: item.content_description.trim(),
    })),
  }), [companyIntakeFiles, companyIntakeText]);
  const hasFreshCompanyIntakeSummary = Boolean(companyIntakeSummary.trim() && companyIntakeSummaryKey === companyIntakeAutoKey);
  const effectiveCompanyIntakeSummary = hasFreshCompanyIntakeSummary ? companyIntakeSummary : '';
  const waitingForAutoCompanyIntake = onboardingStep === 3
    && Boolean(companyIntakeText.trim() || companyIntakeFiles.length > 0)
    && !analyzingCompanyIntake
    && lastAnalyzedCompanyIntakeKeyRef.current !== companyIntakeAutoKey;
  const companyIntakeNeedsProcessing = onboardingStep === 3
    && Boolean(companyIntakeText.trim() || companyIntakeFiles.length > 0)
    && (!hasFreshCompanyIntakeSummary || waitingForAutoCompanyIntake || analyzingCompanyIntake);
  const commercialKnowledgeText = [
    commercialInfoText.trim() ? `Produtos, preços e condições:\n${commercialInfoText.trim()}` : '',
    commercialInfoLinks.trim() ? `Links, site, catálogo ou redes sociais:\n${commercialInfoLinks.trim()}` : '',
  ].filter(Boolean).join('\n\n');
  const onboardingKnowledgeWords = wordCount([
    effectiveCompanyIntakeSummary || companyIntakeText,
    commercialKnowledgeText,
  ].filter(Boolean).join('\n\n'));
  const companyReadinessItems = useMemo(() => buildCompanyReadinessChecklist({
    draft: onboardingDraft,
    files: companyIntakeFiles,
    summary: effectiveCompanyIntakeSummary,
    text: companyIntakeText,
  }), [companyIntakeFiles, companyIntakeText, effectiveCompanyIntakeSummary, onboardingDraft]);
  const answeredCompanyGuidedQuestionIds = useMemo(() => new Set(companyGuidedQuestions
    .filter((question) => Boolean(companyGuidedAnswers[question.id]?.trim()) || guidedQuestionAnsweredInText(companyIntakeText, question.id))
    .map((question) => question.id)), [companyGuidedAnswers, companyIntakeText]);
  const answeredCompanyGuidedCount = answeredCompanyGuidedQuestionIds.size;
  const currentCompanyGuidedQuestion = companyGuidedQuestions.find((question) => !answeredCompanyGuidedQuestionIds.has(question.id)) || null;
  const getCompanyGuidedQuestionText = (question: CompanyGuidedQuestion) => companyGuidedQuestionOverrides[question.id] || question.question;
  const companyGuidedConversation = companyGuidedQuestions
    .filter((question) => answeredCompanyGuidedQuestionIds.has(question.id))
    .map((question) => ({
      question,
      questionText: getCompanyGuidedQuestionText(question),
      answer: companyGuidedAnswers[question.id] || '',
    }));
  const companyGuidedLearningSummaryRequestKey = useMemo(() => JSON.stringify({
    company_name: onboardingDraft.company_name.trim(),
    company_segment: onboardingDraft.segment.trim(),
    company_description: [effectiveCompanyIntakeSummary.trim(), companyIntakeText.trim()].filter(Boolean).join('\n\n'),
    conversation: companyGuidedConversation.map((message) => ({
      question: message.questionText,
      answer: message.answer,
    })),
  }), [companyGuidedConversation, companyIntakeText, effectiveCompanyIntakeSummary, onboardingDraft.company_name, onboardingDraft.segment]);
  const companyGuidedMinimumComplete = answeredCompanyGuidedCount >= minimumCompanyGuidedAnswers;
  const companyReadinessVisible = Boolean(effectiveCompanyIntakeSummary.trim()) && !analyzingCompanyIntake;
  const missingCompanyReadinessItems = companyReadinessItems.filter((item) => item.id !== 'files' && !item.ready);
  const companyReadinessComplete = companyReadinessItems
    .filter((item) => item.id !== 'files')
    .every((item) => item.ready);
  const canUnlockCompanyGuidedQuestions = companyReadinessVisible && companyReadinessComplete;
  const canShowCompanyGuidedQuestions = companyGuidedQuestionsUnlocked || canUnlockCompanyGuidedQuestions;
  const showOnboardingHeaderBella = onboardingStep !== 3;
  const hideCompanyReadinessResult = canShowCompanyGuidedQuestions && companyReadinessComplete;

  useEffect(() => {
    if (canUnlockCompanyGuidedQuestions) {
      setCompanyGuidedQuestionsUnlocked(true);
    }
  }, [canUnlockCompanyGuidedQuestions]);

  useEffect(() => {
    if (companyReadinessWarningOpen && missingCompanyReadinessItems.length === 0) {
      setCompanyReadinessWarningOpen(false);
    }
  }, [companyReadinessWarningOpen, missingCompanyReadinessItems.length]);

  useEffect(() => {
    if (!canShowCompanyGuidedQuestions) return;

    const scrollToBottom = () => {
      const element = companyGuidedScrollRef.current;

      if (!element) return;

      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth',
      });
    };

    const frameId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(scrollToBottom, 180);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [
    answeredCompanyGuidedCount,
    canShowCompanyGuidedQuestions,
    companyGuidedConversation.length,
    companyGuidedLearningSummary,
    currentCompanyGuidedQuestion?.id,
    generatingCompanyGuidedQuestion,
  ]);

  useEffect(() => {
    if (!canShowCompanyGuidedQuestions || currentCompanyGuidedQuestion || generatingCompanyGuidedQuestion) return;
    if (generatingCompanyGuidedLearningSummary) return;
    if (companyGuidedLearningSummaryKey === companyGuidedLearningSummaryRequestKey) return;

    setGeneratingCompanyGuidedLearningSummary(true);

    const conversation = companyGuidedConversation.map((message) => ({
      question: message.questionText,
      answer: message.answer,
    }));

    generateCompanyIntakeLearningSummary({
      company_name: onboardingDraft.company_name.trim(),
      company_segment: onboardingDraft.segment.trim(),
      company_description: [effectiveCompanyIntakeSummary.trim(), companyIntakeText.trim()].filter(Boolean).join('\n\n'),
      conversation,
    }).then((result) => {
      setCompanyGuidedLearningSummary(result.summary);
      setCompanyGuidedLearningSummaryKey(companyGuidedLearningSummaryRequestKey);
    }).catch(() => {
      setCompanyGuidedLearningSummary([
        'Perfeito! Acho que já entendi como sua empresa funciona.',
        'Vou resumir o que aprendi para configurar sua IA.',
        '',
        '✓ Atendimento:',
        'Vou usar o passo a passo que você informou para conduzir o cliente.',
        '',
        '✓ Produtos:',
        onboardingDraft.segment.trim() || 'Não informado.',
        '',
        '✓ Personalizações:',
        'Não informado.',
        '',
        '✓ Perguntas frequentes:',
        'Vou considerar as dúvidas que você respondeu para a Bella.',
        '',
        '✓ Prazo:',
        'Não informado.',
        '',
        '✓ Atenção especial:',
        'Não informar dados que não foram confirmados.',
      ].join('\n'));
      setCompanyGuidedLearningSummaryKey(companyGuidedLearningSummaryRequestKey);
    }).finally(() => {
      setGeneratingCompanyGuidedLearningSummary(false);
    });
  }, [
    canShowCompanyGuidedQuestions,
    companyGuidedConversation,
    companyGuidedLearningSummaryKey,
    companyGuidedLearningSummaryRequestKey,
    companyIntakeText,
    currentCompanyGuidedQuestion,
    effectiveCompanyIntakeSummary,
    generatingCompanyGuidedLearningSummary,
    generatingCompanyGuidedQuestion,
    onboardingDraft.company_name,
    onboardingDraft.segment,
  ]);

  const handleChangeSection = (section: string) => {
    setActiveSection(section as SectionId);
  };

  useEffect(() => {
    if (!pendingScrollElementId) return;

    const timeout = window.setTimeout(() => {
      const element = document.getElementById(pendingScrollElementId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const field = element?.querySelector('input, textarea, select, button') as HTMLElement | null;
      field?.focus({ preventScroll: true });
      setPendingScrollElementId(null);
    }, 140);

    return () => window.clearTimeout(timeout);
  }, [activeSection, botConfigTab, pendingScrollElementId, whatsappTab]);

  const goToQualityDestination = (destination: QualityDestination) => {
    setActiveSection(destination.section);

    if (destination.section === 'bot-config' && destination.tab) {
      setBotConfigTab(destination.tab as BotConfigTab);
    }

    if (destination.section === 'whatsapp') {
      setWhatsappTab((destination.tab as WhatsappTab | undefined) || 'status');
    }

    if (destination.field) {
      setBotConfigFocusField(destination.field);
    }

    if (destination.elementId) {
      setPendingScrollElementId(destination.elementId);
    }
  };

  const handleRefresh = async () => {
    await loadPanel();
    toast('Dados atualizados.');
  };

  const appendCompanyIntakeFiles = (
    selectedFiles: FileList | null,
    setFiles: Dispatch<SetStateAction<CompanyIntakeDraftFile[]>>
  ) => {
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

    setFiles((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        content_description: '',
      })),
    ].slice(0, 10));
  };

  const handleCompanyIntakeFileSelect = (selectedFiles: FileList | null) => {
    appendCompanyIntakeFiles(selectedFiles, setCompanyIntakeFiles);
  };

  const handleCommercialInfoFileSelect = (selectedFiles: FileList | null) => {
    appendCompanyIntakeFiles(selectedFiles, setCommercialInfoFiles);
  };

  useEffect(() => {
    companyIntakeAutoKeyRef.current = companyIntakeAutoKey;
  }, [companyIntakeAutoKey]);

  const handleAnalyzeCompanyIntake = async (options?: { source?: 'auto' | 'manual'; key?: string }) => {
    if ((!companyIntakeText.trim() && companyIntakeFiles.length === 0) || analyzingCompanyIntake) return;
    const targetKey = options?.key || companyIntakeAutoKey;

    if (options?.source === 'auto' && lastAnalyzedCompanyIntakeKeyRef.current === targetKey) return;

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
        company_name: onboardingDraft.company_name.trim(),
        segment: onboardingDraft.segment.trim(),
        company_text: companyIntakeText.trim(),
        files,
      });
      if (companyIntakeAutoKeyRef.current === targetKey) {
        setCompanyIntakeSummary(result.summary);
        setCompanyIntakeSummaryKey(targetKey);
        lastAnalyzedCompanyIntakeKeyRef.current = targetKey;
      }
    } catch (error) {
      setCompanyIntakeError(error instanceof Error ? error.message : 'Não foi possível analisar as informações da empresa.');
    } finally {
      setAnalyzingCompanyIntake(false);
    }
  };

  useEffect(() => {
    if (onboardingMode === 'hidden' || onboardingStep !== 3) return;
    if (!companyIntakeText.trim() && companyIntakeFiles.length === 0) return;
    if (analyzingCompanyIntake) return;
    if (lastAnalyzedCompanyIntakeKeyRef.current === companyIntakeAutoKey) return;

    const timeoutId = window.setTimeout(() => {
      void handleAnalyzeCompanyIntake({ source: 'auto', key: companyIntakeAutoKey });
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [analyzingCompanyIntake, companyIntakeAutoKey, companyIntakeFiles.length, companyIntakeText, onboardingMode, onboardingStep]);

  const handleSaveCompanyIntake = async () => {
    if ((!effectiveCompanyIntakeSummary.trim() && !companyIntakeText.trim() && companyIntakeFiles.length === 0 && !commercialKnowledgeText.trim() && commercialInfoFiles.length === 0) || savingCompanyIntake) return;
    setCompanyIntakeError('');
    setSavingCompanyIntake(true);

    try {
      if ((effectiveCompanyIntakeSummary || companyIntakeText).trim()) {
        const createdKnowledge = await createKnowledge({
          title: 'Leitura inicial da empresa',
          category: 'Geral',
          content: [
            (effectiveCompanyIntakeSummary || companyIntakeText).trim(),
            companyIntakeText.trim() ? `\nTexto original informado pela empresa:\n${companyIntakeText.trim()}` : '',
          ].filter(Boolean).join('\n'),
          active: true,
        });
        setKnowledge((current) => [createdKnowledge, ...current]);
      }

      if (commercialKnowledgeText.trim()) {
        const createdCommercialKnowledge = await createKnowledge({
          title: 'Produtos, preços e links informados no onboarding',
          category: 'Preços',
          content: commercialKnowledgeText.trim(),
          active: true,
        });
        setKnowledge((current) => [createdCommercialKnowledge, ...current]);
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

      const createdCommercialFiles = await Promise.all(commercialInfoFiles.map(async (item) => createKnowledgeFile({
        title: item.file.name.replace(/\.[^.]+$/, ''),
        description: 'Catálogo, planilha de produtos ou arquivo comercial enviado no onboarding.',
        content_description: item.content_description.trim() || 'Produtos, preços, catálogo ou informações comerciais.',
        extracted_text: '',
        original_filename: item.file.name,
        mime_type: mimeTypeForFile(item.file),
        size_bytes: item.file.size,
        data_url: await readFileAsDataUrl(item.file),
        active: true,
      })));

      if (createdFiles.length > 0 || createdCommercialFiles.length > 0) {
        setKnowledgeFiles((current) => [...createdCommercialFiles.reverse(), ...createdFiles.reverse(), ...current]);
      }

      setCompanyIntakeText('');
      setCompanyGuidedAnswer('');
      setCompanyGuidedAnswers({});
      setCompanyGuidedQuestionOverrides({});
      setCompanyGuidedQuestionsUnlocked(false);
      setCompanyGuidedLearningSummary('');
      setCompanyGuidedLearningSummaryKey('');
      setCompanyIntakeFiles([]);
      setCommercialInfoChoice('idle');
      setCommercialInfoText('');
      setCommercialInfoLinks('');
      setCommercialInfoFiles([]);
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

  const refreshCompanyIntakeExample = async () => {
    const company_name = onboardingDraft.company_name.trim();
    const segment = onboardingDraft.segment.trim();
    const key = `${company_name.toLowerCase()}::${segment.toLowerCase()}`;

    if (!company_name || !segment || companyIntakeExampleKey === key || generatingCompanyIntakeExample) return;

    setGeneratingCompanyIntakeExample(true);

    try {
      const result = await generateCompanyIntakeExample({ company_name, segment });
      setCompanyIntakeExample(result.example || defaultCompanyIntakeExample);
      setCompanyIntakeExampleKey(key);
    } catch {
      setCompanyIntakeExample([
        'Ex:',
        `Atendemos clientes de ${segment.toLowerCase()}.`,
        'Ajudamos com dúvidas, pedidos e informações sobre nossos produtos ou serviços.',
        'Nosso atendimento busca ser claro, rápido e organizado.',
        'Quando necessário, encaminhamos o cliente para uma pessoa da equipe.',
      ].join('\n'));
      setCompanyIntakeExampleKey(key);
    } finally {
      setGeneratingCompanyIntakeExample(false);
    }
  };

  const handleAddCompanyGuidedAnswer = async () => {
    if (!currentCompanyGuidedQuestion) return;
    const answer = companyGuidedAnswer.trim();
    const questionText = getCompanyGuidedQuestionText(currentCompanyGuidedQuestion);

    if (answer.length < 8) {
      toast('Responda a pergunta da Bella antes de avançar.');
      return;
    }

    const answerBlock = [
      `Pergunta ${currentCompanyGuidedQuestion.id}: ${questionText}`,
      `Resposta: ${answer}`,
    ].join('\n');

    setCompanyGuidedAnswers((current) => ({ ...current, [currentCompanyGuidedQuestion.id]: answer }));
    setCompanyIntakeText((current) => [current.trim(), answerBlock].filter(Boolean).join('\n\n'));
    setCompanyGuidedAnswer('');

    if (currentCompanyGuidedQuestion.id === 1 || currentCompanyGuidedQuestion.id === 4) {
      setGeneratingCompanyGuidedQuestion(true);

      try {
        const result = await generateCompanyIntakeFollowUpQuestion({
          company_name: onboardingDraft.company_name.trim(),
          company_segment: onboardingDraft.segment.trim(),
          company_description: [effectiveCompanyIntakeSummary.trim(), companyIntakeText.trim()].filter(Boolean).join('\n\n'),
          question: questionText,
          customer_answer: answer,
          question_count: 2,
          mode: currentCompanyGuidedQuestion.id === 4 ? 'faq_follow_up' : 'service_flow_follow_up',
        });
        const generatedQuestions = (result.questions?.length ? result.questions : [result.question])
          .map((item) => item?.trim())
          .filter(Boolean) as string[];

        if (generatedQuestions.length > 0) {
          const firstTargetId = currentCompanyGuidedQuestion.id === 4 ? 5 : 2;
          setCompanyGuidedQuestionOverrides((current) => ({
            ...current,
            ...(generatedQuestions[0] ? { [firstTargetId]: generatedQuestions[0] } : {}),
            ...(generatedQuestions[1] ? { [firstTargetId + 1]: generatedQuestions[1] } : {}),
          }));
        }
      } catch {
        toast('Não consegui gerar as próximas perguntas da Bella agora. Vou seguir com perguntas padrão.');
      } finally {
        setGeneratingCompanyGuidedQuestion(false);
      }
    }

    toast('Resposta adicionada ao contexto.');
  };

  const onboardingStepIsValid = () => {
    if (onboardingStep === 1) {
      return Boolean(onboardingDraft.company_name.trim() && onboardingDraft.segment.trim());
    }

    if (onboardingStep === 2) {
      return Boolean(onboardingDraft.assistant_name.trim());
    }

    if (onboardingStep === 3) {
      return canShowCompanyGuidedQuestions && companyGuidedMinimumComplete && companyReadinessComplete;
    }

    return true;
  };

  const handleNextOnboardingStep = async () => {
    if (companyIntakeNeedsProcessing) {
      toast(analyzingCompanyIntake ? 'Estou processando as informações da empresa.' : 'Aguarde a leitura da empresa antes de continuar.');
      return;
    }

    if (onboardingStep === 3 && missingCompanyReadinessItems.length > 0) {
      setCompanyReadinessWarningOpen(true);
      toast('Falta completar algumas informações antes de continuar.');
      return;
    }

    if (!onboardingStepIsValid()) {
      toast(onboardingStep === 3 ? 'Responda pelo menos 2 perguntas da Bella e complete os itens marcados como Não.' : 'Preencha os campos principais para continuar.');
      return;
    }

    if (onboardingStep === 1) {
      await refreshCompanyIntakeExample();
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

      const nextAssistantName = onboardingDraft.assistant_name.trim() || botConfig.assistant_name;
      const nextCompanyName = onboardingDraft.company_name.trim() || botConfig.company_name;
      const nextSegment = onboardingDraft.segment.trim() || botConfig.segment;
      const nextTone = onboardingDraft.tone.trim() || botConfig.tone;
      const nextCompanyDescription = companyIntakeText.trim() || effectiveCompanyIntakeSummary.trim() || botConfig.company_description;
      const automaticWelcomeMessage = buildAutomaticWelcomeMessage({
        assistantName: nextAssistantName,
        companyName: nextCompanyName,
        segment: nextSegment,
      });

      const updated = await updateBotConfig({
        ...botConfig,
        assistant_name: nextAssistantName,
        company_name: nextCompanyName,
        segment: nextSegment,
        tone: nextTone,
        response_length: onboardingDraft.response_length,
        company_description: nextCompanyDescription,
        welcome_message: automaticWelcomeMessage,
      });

      setBotConfig(updated);
      setFinishingProgress(2);

      if (effectiveCompanyIntakeSummary.trim() || companyIntakeText.trim() || companyIntakeFiles.length > 0 || commercialKnowledgeText.trim() || commercialInfoFiles.length > 0) {
        await handleSaveCompanyIntake();
      }

      await wait(650);
      setFinishingProgress(3);
      await wait(650);
      const completedUser = await markOnboardingCompleted();
      setCurrentUser(completedUser);
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

  const handleGoToBotSimulation = () => {
    window.localStorage.setItem(onboardingStorageKey, 'true');
    setOnboardingMode('hidden');
    setActiveSection('bot-config');
    setBotConfigTab('simulation');
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
    setCurrentUser(null);
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
                Você já pode testar a IA pelo simulador antes de conectar o WhatsApp, ou conectar agora para começar a atender clientes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleGoToBotSimulation}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Testar IA agora
                  <MessageCircle size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleGoToWhatsAppSetup}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Conectar WhatsApp
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingMode('hidden')}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-800 px-5 py-3 text-sm font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white"
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
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/40">
                        <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="relative rounded-2xl border border-emerald-400/30 bg-slate-900 px-4 py-3 shadow-lg">
                        <span className="absolute left-[-7px] top-5 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/30 bg-slate-900" />
                        <p className="text-sm font-semibold text-white">Olá, eu sou a Bella.</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          Vou te ajudar a configurar seu bot e fazer os primeiros passos dele.
                        </p>
                      </div>
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
                {showOnboardingHeaderBella && (
                  <div className="mb-5 flex items-start gap-4 rounded-2xl border border-emerald-400/20 bg-slate-950/70 p-4">
                    <div className="bella-guide-avatar flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
                      <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="relative max-w-2xl rounded-2xl border border-emerald-400/30 bg-slate-900 px-4 py-3">
                      <span className="absolute left-[-7px] top-6 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/30 bg-slate-900" />
                      <TypewriterText
                        key={`bella-guide-title-${onboardingStep}`}
                        text={onboardingBellaGuide.title}
                        className="text-sm font-semibold text-white"
                        onComplete={() => setShowSecondBellaText(true)}
                      />

                      {showSecondBellaText && (
                        <TypewriterText
                          key={`bella-guide-body-${onboardingStep}`}
                          text={onboardingBellaGuide.body}
                          speed={25}
                          className="mt-1 text-sm leading-6 text-slate-300"
                        />
                      )}
                    </div>
                  </div>
                )}
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
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-300">
                      Segmento
                      <input
                        value={onboardingDraft.segment}
                        onChange={(event) => updateOnboardingDraft('segment', event.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </label>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {['Atendente', 'Ana', 'Assistente'].map((name) => (
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
                  <div className={`grid gap-5 transition-all duration-500 ${hideCompanyReadinessResult ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]'}`}>
                    <div className="space-y-4">
                      <label className="space-y-2 text-sm font-medium text-slate-300">
                        O que sua empresa faz?
                        <textarea
                          value={companyIntakeText}
                          onChange={(event) => setCompanyIntakeText(event.target.value)}
                          rows={8}
                          placeholder={generatingCompanyIntakeExample ? 'Gerando exemplo com base na sua empresa...' : companyIntakeExample}
                          className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-400"
                        />
                      </label>

                      {canShowCompanyGuidedQuestions && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/80 p-4">
                          <div ref={companyGuidedScrollRef} className="max-h-[430px] space-y-4 overflow-y-auto pr-1">
                            {companyGuidedConversation.map((message) => (
                              <div key={message.question.id} className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
                                    <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                                  </div>
                                  <div className="relative flex-1 rounded-2xl border border-emerald-400/25 bg-slate-900 px-4 py-3">
                                    <span className="absolute left-[-7px] top-5 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/25 bg-slate-900" />
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Bella</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">{message.questionText}</p>
                                  </div>
                                </div>
                                <div className="ml-auto max-w-[88%] rounded-2xl border border-slate-700 bg-emerald-600 px-4 py-3 text-sm leading-6 text-white">
                                  {message.answer}
                                </div>
                              </div>
                            ))}

                            {generatingCompanyGuidedQuestion ? (
                              <div className="flex items-start gap-3">
                                <div className="bella-guide-avatar flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
                                  <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                                </div>
                                <div className="relative flex-1 rounded-2xl border border-emerald-400/30 bg-slate-900 px-4 py-3">
                                  <span className="absolute left-[-7px] top-5 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/30 bg-slate-900" />
                                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                                    <RefreshCw size={14} className="animate-spin" />
                                    Bella está pensando na próxima pergunta...
                                  </div>
                                </div>
                              </div>
                            ) : currentCompanyGuidedQuestion ? (
                              <div className="flex items-start gap-3">
                                <div className="bella-guide-avatar flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
                                  <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                                </div>
                                <div className="relative flex-1 rounded-2xl border border-emerald-400/30 bg-slate-900 px-4 py-3">
                                  <span className="absolute left-[-7px] top-5 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/30 bg-slate-900" />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300">
                                      Pergunta {currentCompanyGuidedQuestion.id}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                      currentCompanyGuidedQuestion.importance === 'required'
                                        ? 'bg-emerald-500/15 text-emerald-200'
                                        : currentCompanyGuidedQuestion.importance === 'recommended'
                                          ? 'bg-amber-500/15 text-amber-200'
                                          : 'bg-slate-700/60 text-slate-300'
                                    }`}>
                                      {currentCompanyGuidedQuestion.badge}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${companyGuidedMinimumComplete ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                                      {answeredCompanyGuidedCount}/{minimumCompanyGuidedAnswers} mínimas
                                    </span>
                                  </div>
                                  <TypewriterText
                                    key={`guided-question-body-${currentCompanyGuidedQuestion.id}`}
                                    text={getCompanyGuidedQuestionText(currentCompanyGuidedQuestion)}
                                    speed={18}
                                    className="mt-3 text-sm leading-6 text-slate-300"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
                                  <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                                </div>
                                <div className="relative flex-1 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
                                  <span className="absolute left-[-7px] top-5 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/25 bg-emerald-500/10" />
                                  {!companyGuidedLearningSummary ? (
                                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                                      <RefreshCw size={14} className="animate-spin" />
                                      Bella está montando o resumo do que aprendeu...
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <TypewriterText
                                        key={`guided-learning-summary-${companyGuidedLearningSummaryKey}`}
                                        text={companyGuidedLearningSummary}
                                        speed={10}
                                        className="whitespace-pre-line text-sm leading-6 text-emerald-50"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {currentCompanyGuidedQuestion && !generatingCompanyGuidedQuestion && (
                            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
                              <textarea
                                value={companyGuidedAnswer}
                                onChange={(event) => setCompanyGuidedAnswer(event.target.value)}
                                rows={3}
                                placeholder="Digite sua resposta para a Bella..."
                                className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
                              />
                              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-slate-500">
                                  Cada resposta entra automaticamente no contexto do bot.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleAddCompanyGuidedAnswer()}
                                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                                >
                                  Enviar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {canShowCompanyGuidedQuestions && !currentCompanyGuidedQuestion && !generatingCompanyGuidedQuestion && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/80 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-950/30">
                              <img src="/brand/bella-avatar.png" alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="relative flex-1 rounded-2xl border border-emerald-400/25 bg-slate-900 px-4 py-3">
                              <span className="absolute left-[-7px] top-5 h-3.5 w-3.5 rotate-45 border-b border-l border-emerald-400/25 bg-slate-900" />
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Bella</p>
                              <p className="mt-2 text-sm font-semibold leading-6 text-white">
                                Você gostaria de incluir produtos, preços, catálogos ou links para eu responder melhor seus clientes?
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                Por exemplo: uma planilha com produtos, uma tabela de preços, um catálogo em PDF, o link do site, Instagram, cardápio ou condições comerciais.
                              </p>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                Isso é opcional. Se preferir, você pode pular e adicionar depois.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-2 sm:ml-[60px] sm:flex-row sm:justify-end">
                            <div className="flex gap-2 sm:justify-end">
                              <button
                                type="button"
                                onClick={() => setCommercialInfoChoice('yes')}
                                className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${commercialInfoChoice === 'yes' ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500 hover:text-white'}`}
                              >
                                Sim, quero incluir
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommercialInfoChoice('no')}
                                className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${commercialInfoChoice === 'no' ? 'bg-slate-700 text-white' : 'border border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white'}`}
                              >
                                Não, pular
                              </button>
                            </div>
                          </div>

                          {commercialInfoChoice === 'yes' && (
                            <div className="mt-4 space-y-3">
                              <label className="block space-y-2 text-sm font-medium text-slate-300">
                                Produtos, preços ou condições
                                <textarea
                                  value={commercialInfoText}
                                  onChange={(event) => setCommercialInfoText(event.target.value)}
                                  rows={4}
                                  placeholder="Ex: Capinha personalizada custa a partir de R$ 49,90. O prazo médio é de 5 a 7 dias. Confirmar preço final com atendente quando houver personalização especial."
                                  className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-400"
                                />
                              </label>

                              <label className="block space-y-2 text-sm font-medium text-slate-300">
                                Site, catálogo ou redes sociais
                                <input
                                  value={commercialInfoLinks}
                                  onChange={(event) => setCommercialInfoLinks(event.target.value)}
                                  placeholder="Ex: https://minhaloja.com/catalogo ou @minhaloja"
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                                />
                              </label>

                              <div className="flex flex-col gap-2">
                                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
                                  <Paperclip size={16} />
                                  Anexar planilha ou catálogo
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,text/csv,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                    onChange={(event) => handleCommercialInfoFileSelect(event.target.files)}
                                    className="hidden"
                                  />
                                </label>

                                {commercialInfoFiles.length > 0 && (
                                  <div className="grid gap-2">
                                    {commercialInfoFiles.map((item) => (
                                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                                        <FileText size={16} className="shrink-0 text-slate-400" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{item.file.name}</span>
                                        <span className="text-xs text-slate-500">{formatFileSize(item.file.size)}</span>
                                        <button
                                          type="button"
                                          onClick={() => setCommercialInfoFiles((current) => current.filter((file) => file.id !== item.id))}
                                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
                                          aria-label="Remover arquivo comercial"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

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
                    </div>

                    <aside className={`rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition-all duration-500 ${hideCompanyReadinessResult ? 'max-h-0 overflow-hidden p-0 opacity-0 scale-95 pointer-events-none lg:hidden' : 'opacity-100 scale-100'}`}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resultado</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">O que a IA entendeu</h3>
                      {analyzingCompanyIntake ? (
                        <div className="mt-5 space-y-3">
                          <div className="text-2xl">🧠</div>
                          <p className="text-sm font-semibold text-white">Lendo empresa...</p>
                          {contextProcessingItems.map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                              <CheckCircle2 size={15} className="text-emerald-300" />
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : effectiveCompanyIntakeSummary ? (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">Primeira camada</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">Essencial para testar o bot.</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${companyReadinessComplete ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                                {companyReadinessComplete ? 'Pronto' : 'Pendente'}
                              </span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {companyReadinessItems.map((item) => (
                                <div key={item.id} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-400">{item.label}</p>
                                    <p className={`mt-0.5 truncate text-sm ${item.ready ? 'text-white' : 'text-slate-500'}`}>{item.value}</p>
                                  </div>
                                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold ${item.ready ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
                                    {item.ready ? 'OK' : 'Não'}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className={`mt-3 text-xs leading-5 ${companyReadinessComplete ? 'text-emerald-200' : 'text-slate-500'}`}>
                              {companyReadinessComplete ? 'Depois disso, o cliente já consegue testar o bot.' : 'Complete os itens com Não para liberar o próximo passo.'}
                            </p>
                          </div>
                        </div>
                      ) : liveUnderstanding.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {waitingForAutoCompanyIntake && (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                              <RefreshCw size={13} className="animate-spin" />
                              Processando informações...
                            </div>
                          )}
                          {liveUnderstanding.map((item) => (
                            <div key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
                              <CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-300" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-5 text-sm leading-6 text-slate-500">
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
                      ['Assistente', onboardingDraft.assistant_name || 'Atendente'],
                      ['Tom', onboardingDraft.tone || 'Padrão do assistente'],
                      ['Resposta', onboardingDraft.response_length],
                      ['Conhecimento', `${onboardingKnowledgeWords} palavras · ${companyIntakeFiles.length + commercialInfoFiles.length} arquivo${companyIntakeFiles.length + commercialInfoFiles.length === 1 ? '' : 's'} enviado${companyIntakeFiles.length + commercialInfoFiles.length === 1 ? '' : 's'}`],
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
                          value={effectiveCompanyIntakeSummary || companyIntakeText}
                          onChange={(event) => {
                            if (effectiveCompanyIntakeSummary) {
                              setCompanyIntakeSummary(event.target.value);
                              setCompanyIntakeSummaryKey(companyIntakeAutoKey);
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
                          {effectiveCompanyIntakeSummary || companyIntakeText || 'Nenhum contexto informado ainda.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {companyReadinessWarningOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl border border-amber-400/25 bg-slate-900 p-5 shadow-2xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
                        <AlertCircle size={22} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">Falta completar uma informação</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Adicione no texto “O que sua empresa faz?” as informações abaixo para eu conseguir liberar o próximo passo.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {missingCompanyReadinessItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm font-semibold text-slate-200">
                          <span className="h-2 w-2 rounded-full bg-amber-300" />
                          {item.label}
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-400">
                      Exemplo: “Atendemos de segunda a sexta, das 8h às 18h.”
                    </p>

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setCompanyReadinessWarningOpen(false)}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        Fechar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompanyReadinessWarningOpen(false)}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Vou completar no texto
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                    onClick={() => void handleNextOnboardingStep()}
                    disabled={generatingCompanyIntakeExample || companyIntakeNeedsProcessing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {generatingCompanyIntakeExample ? 'Gerando exemplo...' : companyIntakeNeedsProcessing ? 'Processando empresa...' : 'Continuar'}
                    {companyIntakeNeedsProcessing ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}
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

              {onboardingCompleted ? (
                <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/80 shadow-panel sm:rounded-3xl">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-300">
                          <Sparkles size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 sm:text-sm">Segunda camada</p>
                          <h2 className="mt-1 text-xl font-semibold text-white">Melhore a qualidade do assistente</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                            Seu assistente está {assistantQualityScore}% configurado. Complete os itens abaixo para melhorar a qualidade das respostas.
                          </p>
                        </div>
                      </div>
                      <div className="min-w-[220px] rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Qualidade</span>
                          <span className="text-sm font-bold text-white">{assistantQualityScore}%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-800">
                          <div className={`h-full rounded-full transition-all ${assistantQualityBarClass}`} style={{ width: `${assistantQualityScore}%` }} />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-300">{assistantQualityLabel}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {assistantQualityGroups.map((group) => {
                        const groupScore = Math.round(group.score * 100);

                        return (
                          <button
                            key={group.label}
                            type="button"
                            onClick={() => goToQualityDestination(group.destination)}
                            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-left transition hover:border-emerald-500/40 hover:bg-slate-900/90"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-100">{group.label}</span>
                              <span className="text-xs font-bold text-emerald-200">{groupScore}%</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${groupScore}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Peso {group.weight}%</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {assistantQualityItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => goToQualityDestination(item.destination)}
                          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-left transition hover:border-emerald-500/40 hover:bg-slate-900/90"
                        >
                          <CheckCircle2 size={15} className={item.ready ? 'text-emerald-300' : 'text-slate-600'} />
                          <span className={item.ready ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-slate-500'}>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-4">
                      <span>25% — Configuração básica</span>
                      <span>55% — Bom</span>
                      <span>80% — Muito bom</span>
                      <span>100% — Assistente otimizado</span>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('bot-config');
                          setBotConfigTab('config');
                        }}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Completar conhecimento
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('bot-config');
                          setBotConfigTab('simulation');
                        }}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        Testar IA
                        <MessageCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
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
                  focusField={botConfigFocusField}
                  onFocusFieldDone={() => setBotConfigFocusField(null)}
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
