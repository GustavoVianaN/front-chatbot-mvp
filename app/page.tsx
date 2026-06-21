'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { getBotConfig, getConversations, getDashboard, getKnowledge, getSettings, getWhatsappStatus, logout, replyToConversation, updateBotConfig, updateConversationBot, updateConversationStatus, updateSettings } from '@/lib/api';
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

export default function Home() {
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
    } catch (error) {
      await logout();
      toast(error instanceof Error ? error.message : 'Sessão expirada. Faça login novamente.');
      window.location.href = '/login';
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    loadPanel();
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? conversations[0] ?? null,
    [conversations, selectedConversationId]
  );
  const companyName = botConfig?.company_name || settings?.company_name || selectedConversation?.company?.name || 'Painel de Atendimento';
  const whatsappConnected = Boolean(whatsappStatus?.connected);

  const handleToggleBot = async () => {
    if (!dashboard || !botConfig) return;

    if (!whatsappConnected) {
      toast('Conecte o WhatsApp antes de ativar ou pausar o bot.');
      return;
    }

    try {
      setPending(true);
      const newStatus = !dashboard.botEnabled;
      const updated = await updateBotConfig({ ...botConfig, bot_enabled: newStatus });
      setBotConfig(updated);
      setDashboard({ ...dashboard, botEnabled: newStatus });
      toast(`Bot ${newStatus ? 'ativado' : 'pausado'} com sucesso.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível alterar o bot.');
    } finally {
      setPending(false);
    }
  };

  const handleChangeSection = (section: string) => {
    setActiveSection(section as SectionId);
  };

  const handleRefresh = async () => {
    await loadPanel();
    toast('Dados atualizados.');
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
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 pb-24 text-slate-100 lg:pb-0">
      <div className="fixed inset-y-0 left-0 hidden w-80 border-r border-slate-800 bg-slate-950/98 backdrop-blur-xl lg:block xl:w-72">
        <Sidebar sections={sections} activeSection={activeSection} onChange={handleChangeSection} companyName={companyName} />
      </div>
      <main className="min-h-screen lg:ml-80 xl:ml-72">
        <Topbar companyName={companyName} userName="Admin" status={!whatsappConnected ? 'Indisponível' : dashboard?.botEnabled ? 'Ativo' : 'Pausado'} whatsappConnected={whatsappConnected ? 'Conectado' : 'Não conectado'} onLogout={handleLogout} />
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
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                  <button type="button" onClick={handleToggleBot} disabled={!whatsappConnected} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4">
                    {dashboard.botEnabled ? <Pause size={16} /> : <Play size={16} />}
                    {dashboard.botEnabled ? 'Pausar bot' : 'Ativar bot'}
                  </button>
                  <button type="button" onClick={handleRefresh} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 sm:px-4">
                    <RefreshCw size={16} /> Atualizar
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Status do Bot" value={!whatsappConnected ? 'Indisponível' : dashboard.botEnabled ? 'Ativo' : 'Inativo'} tone={whatsappConnected && dashboard.botEnabled ? 'success' : 'neutral'} />
                <MetricCard label="WhatsApp" value={whatsappConnected ? 'Conectado' : 'Não conectado'} tone={whatsappConnected ? 'success' : 'warning'} />
                <MetricCard label="Mensagens hoje" value={dashboard.todayMessages.toString()} />
                <MetricCard label="Respostas IA" value={dashboard.iaResponses.toString()} />
                <MetricCard label="Conversas abertas" value={dashboard.openConversations.toString()} />
                <MetricCard label="Conversas resolvidas" value={dashboard.resolvedConversations.toString()} />
                <MetricCard label="Erros recentes" value={dashboard.recentErrors.toString()} tone={dashboard.recentErrors ? 'danger' : 'success'} />
                <MetricCard label="Uso estimado IA" value={dashboard.estimatedUsage} />
              </div>

              <div className="grid gap-4 xl:gap-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-panel sm:rounded-3xl sm:p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm">Saúde do sistema</p>
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
              </div>
            </section>
          )}

          {activeSection === 'conversations' && (
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

          {activeSection === 'bot-config' && botConfig && (
            <BotConfigPanel botConfig={botConfig} onSave={async (data) => {
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
                <span className="max-w-full truncate">{section.label.replace('Configurar ', '').replace('Base de ', '')}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
