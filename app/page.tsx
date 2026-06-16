'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { getAuthState, getBotConfig, getConversations, getDashboard, getKnowledge, getSettings, getWhatsappStatus, login, logout, replyToConversation, updateBotConfig, updateConversationBot, updateConversationStatus, updateSettings } from '@/lib/api';
import type { BotConfig, Conversation, KnowledgeItem, Settings, WhatsAppStatus } from '@/lib/types';
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
import { toast } from '@/components/Toast';

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Conversas', icon: MessageSquare },
  { id: 'bot-config', label: 'Configurar Bot', icon: Sparkles },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: Bookmark },
  { id: 'whatsapp', label: 'WhatsApp', icon: FileText },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon },
] as const;

type SectionId = (typeof sections)[number]['id'];

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await login(username, password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Não foi possível entrar.');
      return;
    }

    await onAuthenticated();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Acesso administrativo</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Painel do chatbot</h1>
        <div className="mt-8 space-y-4">
          <label className="space-y-2 text-sm text-slate-300">
            Usuário
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500" />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500" />
          </label>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-rose-600/40 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70">
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pending, setPending] = useState(false);

  const loadPanel = async () => {
    try {
      setPending(true);
      const [dashboardData, convos, config, knowledgeData, whatsapp, settingsData] = await Promise.all([
        getDashboard(),
        getConversations(),
        getBotConfig(),
        getKnowledge(),
        getWhatsappStatus(),
        getSettings(),
      ]);
      setDashboard(dashboardData);
      setConversations(convos);
      setSelectedConversationId(convos[0]?.id ?? null);
      setBotConfig(config);
      setKnowledge(knowledgeData);
      setWhatsappStatus(whatsapp);
      setSettings(settingsData);
      setAuthenticated(true);
    } catch (error) {
      setAuthenticated(false);
      toast(error instanceof Error ? error.message : 'Sessão expirada. Faça login novamente.');
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    async function load() {
      const auth = await getAuthState();
      setAuthenticated(auth.authenticated);

      if (auth.authenticated) {
        await loadPanel();
      }
    }

    load();
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? conversations[0] ?? null,
    [conversations, selectedConversationId]
  );
  const companyName = botConfig?.company_name || settings?.company_name || selectedConversation?.company?.name || 'Painel de Atendimento';

  const handleToggleBot = async () => {
    if (!dashboard) return;
    setPending(true);
    const newStatus = !dashboard.botEnabled;
    const updated = await updateBotConfig({ ...botConfig!, bot_enabled: newStatus });
    setBotConfig(updated);
    setDashboard({ ...dashboard, botEnabled: newStatus });
    toast(`Bot ${newStatus ? 'ativado' : 'pausado'} com sucesso.`);
    setPending(false);
  };

  const handleChangeSection = (section: string) => {
    setActiveSection(section as SectionId);
  };

  const handleLogout = async () => {
    await logout();
    setDashboard(null);
    setConversations([]);
    setSelectedConversationId(null);
    setBotConfig(null);
    setKnowledge([]);
    setWhatsappStatus(null);
    setSettings(null);
    setAuthenticated(false);
  };

  if (authenticated === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Carregando...
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen onAuthenticated={loadPanel} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-y-0 left-0 w-80 border-r border-slate-800 bg-slate-950/98 backdrop-blur-xl xl:w-72">
        <Sidebar sections={sections} activeSection={activeSection} onChange={handleChangeSection} companyName={companyName} />
      </div>
      <main className="ml-80 min-h-screen xl:ml-72">
        <Topbar companyName={companyName} userName="Admin" status={dashboard?.botEnabled ? 'Ativo' : 'Pausado'} whatsappConnected={whatsappStatus?.tokenConfigured ? 'Conectado' : 'Aguardando'} onLogout={handleLogout} />
        <div className="px-6 pb-10 pt-6">
          {pending && (
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-300">
              Carregando dados...
            </div>
          )}

          {activeSection === 'dashboard' && dashboard && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Visão geral</p>
                  <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard operacional</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleToggleBot} className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700">
                    {dashboard.botEnabled ? <Pause size={16} /> : <Play size={16} />}
                    {dashboard.botEnabled ? 'Pausar bot' : 'Ativar bot'}
                  </button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700">
                    <RefreshCw size={16} /> Atualizar
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Status do Bot" value={dashboard.botEnabled ? 'Ativo' : 'Inativo'} tone={dashboard.botEnabled ? 'success' : 'neutral'} />
                <MetricCard label="WhatsApp" value={whatsappStatus?.tokenConfigured ? 'Conectado' : 'Aguardando'} tone={whatsappStatus?.tokenConfigured ? 'success' : 'warning'} />
                <MetricCard label="Mensagens hoje" value={dashboard.todayMessages.toString()} />
                <MetricCard label="Respostas IA" value={dashboard.iaResponses.toString()} />
                <MetricCard label="Conversas abertas" value={dashboard.openConversations.toString()} />
                <MetricCard label="Conversas resolvidas" value={dashboard.resolvedConversations.toString()} />
                <MetricCard label="Erros recentes" value={dashboard.recentErrors.toString()} tone={dashboard.recentErrors ? 'danger' : 'success'} />
                <MetricCard label="Uso estimado IA" value={dashboard.estimatedUsage} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-panel">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Saúde do sistema</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-4">
                      <p className="text-sm text-slate-400">Última mensagem</p>
                      <p className="mt-2 text-sm font-medium text-slate-100">{dashboard.lastMessage}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-4">
                        <p className="text-sm text-slate-400">Webhook</p>
                        <p className="mt-2 text-sm font-medium text-slate-100">{whatsappStatus?.webhookStatus}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-4">
                        <p className="text-sm text-slate-400">Último evento</p>
                        <p className="mt-2 text-sm font-medium text-slate-100">{whatsappStatus?.lastEvent}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-panel">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Ações rápidas</p>
                  <div className="mt-4 grid gap-3">
                    <button type="button" className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-600">
                      Configurar bot
                    </button>
                    <button type="button" className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-600">
                      Ver conversas
                    </button>
                    <button type="button" className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-600">
                      Testar resposta
                    </button>
                    <button type="button" className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-600">
                      Pausar automação
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'conversations' && (
            <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel">
                <ConversationList conversations={conversations} selectedId={selectedConversationId} onSelect={setSelectedConversationId} />
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel">
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
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel">
                <ContactDetails conversation={selectedConversation} />
              </div>
            </section>
          )}

          {activeSection === 'bot-config' && botConfig && (
            <BotConfigPanel botConfig={botConfig} onSave={async (data) => {
              setPending(true);
              const updated = await updateBotConfig(data);
              setBotConfig(updated);
              toast('Configurações do bot salvas.');
              setPending(false);
            }} />
          )}

          {activeSection === 'knowledge' && (
            <KnowledgeEditor knowledge={knowledge} onChange={setKnowledge} />
          )}

          {activeSection === 'whatsapp' && whatsappStatus && (
            <WhatsAppStatusPanel status={whatsappStatus} />
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
    </div>
  );
}
