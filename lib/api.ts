'use server';

import { cookies } from 'next/headers';
import type {
  BotConfig,
  AuthUser,
  AutomationRule,
  AutomationRuleInput,
  CompanyIntakeInput,
  Conversation,
  DashboardSummary,
  ImageGenerationUsage,
  IntegrationConnection,
  IntegrationInput,
  KnowledgeFile,
  KnowledgeFileUpload,
  KnowledgeDescriptionAudio,
  KnowledgeDescriptionAudioPreview,
  KnowledgeItem,
  KnowledgeStatus,
  KnowledgeSource,
  KnowledgeSourceInput,
  Message,
  ProductItem,
  ProductImportInput,
  ProductImportPreview,
  ProductItemInput,
  Settings,
  SimulationAttachment,
  SimulationLog,
  WhatsAppDisconnectEvent,
  WhatsAppStatus,
} from './types';

const DEFAULT_BACKEND_API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = 'chatbot_admin_token';
const REFRESH_COOKIE = 'chatbot_refresh_token';
const DEFAULT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 365;

function ttlToSeconds(ttl?: string, fallback = DEFAULT_ACCESS_MAX_AGE) {
  const match = /^(\d+)([smhd])$/.exec(ttl || '');

  if (!match) return fallback;

  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 60 * 60 : 60 * 60 * 24;
  return value * multiplier;
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

function getBackendApiUrl() {
  if (!process.env.BACKEND_API_URL && process.env.NODE_ENV === 'production') {
    throw new Error('BACKEND_API_URL is required');
  }

  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL).replace(/\/$/, '');
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  let response = await fetch(`${getBackendApiUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await fetch(`${getBackendApiUrl()}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshed}`,
          ...init?.headers,
        },
      });
    }
  }

  if (!response.ok) {
    let errorMessage = '';

    try {
      const payload = await response.json() as { error?: string; message?: string };
      errorMessage = payload.error || payload.message || '';
    } catch {
      errorMessage = '';
    }

    throw new Error(response.status === 401 ? 'Sessão expirada.' : errorMessage || 'Não foi possível concluir a operação.');
  }

  return response.json() as Promise<T>;
}

async function refreshSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) return null;

  const response = await fetch(`${getBackendApiUrl()}/auth/refresh`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    cookieStore.delete(AUTH_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    return null;
  }

  const payload = (await response.json()) as {
    token: string;
    refreshToken: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
  };

  cookieStore.set(AUTH_COOKIE, payload.token, sessionCookieOptions(ttlToSeconds(payload.accessTokenExpiresIn, DEFAULT_ACCESS_MAX_AGE)));
  cookieStore.set(REFRESH_COOKIE, payload.refreshToken, sessionCookieOptions(ttlToSeconds(payload.refreshTokenExpiresIn, DEFAULT_REFRESH_MAX_AGE)));

  return payload.token;
}

export async function login(username: string, password: string) {
  let response: Response;

  try {
    response = await fetch(`${getBackendApiUrl()}/auth/login`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: username, password }),
    });
  } catch {
    return { success: false, error: 'Não foi possível conectar ao backend. Verifique se a API está rodando na porta 3000.' };
  }

  if (!response.ok) {
    return { success: false, error: 'Usuário ou senha inválidos.' };
  }

  const payload = (await response.json()) as {
    token: string;
    refreshToken: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
    user: { email: string; role: string };
  };

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, payload.token, sessionCookieOptions(ttlToSeconds(payload.accessTokenExpiresIn, DEFAULT_ACCESS_MAX_AGE)));
  cookieStore.set(REFRESH_COOKIE, payload.refreshToken, sessionCookieOptions(ttlToSeconds(payload.refreshTokenExpiresIn, DEFAULT_REFRESH_MAX_AGE)));

  return { success: true, user: payload.user };
}

export async function logout() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${getBackendApiUrl()}/auth/logout`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  cookieStore.delete(AUTH_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  return { success: true };
}

export async function setupPassword(token: string, password: string) {
  const response = await fetch(`${getBackendApiUrl()}/auth/setup-password`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    return { success: false, error: 'Link inválido, expirado ou senha fraca.' };
  }

  return { success: true };
}

export async function getAuthState() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!token && !refreshToken) {
    return { authenticated: false };
  }

  try {
    if (!token && refreshToken) {
      const refreshed = await refreshSession();
      return { authenticated: Boolean(refreshed) };
    }

    await apiRequest('/auth/me');
    return { authenticated: true };
  } catch {
    cookieStore.delete(AUTH_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    return { authenticated: false };
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  const payload = await apiRequest<{ authenticated: boolean; user: AuthUser }>('/auth/me');
  return payload.user;
}

export async function markOnboardingCompleted(): Promise<AuthUser> {
  const payload = await apiRequest<{ success: boolean; user: AuthUser }>('/auth/onboarding-completed', {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  return payload.user;
}

export async function getDashboard(): Promise<DashboardSummary> {
  return apiRequest('/dashboard');
}

export async function analyzeCompanyIntake(data: CompanyIntakeInput): Promise<{ summary: string }> {
  return apiRequest('/dashboard/company-intake/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateCompanyIntakeExample(data: { company_name: string; segment: string }): Promise<{ example: string }> {
  return apiRequest('/dashboard/company-intake/example', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateCompanyIntakeFollowUpQuestion(data: {
  company_name: string;
  company_segment: string;
  company_description: string;
  question: string;
  customer_answer: string;
  question_count?: number;
  mode?: 'service_flow_follow_up' | 'faq_follow_up';
}): Promise<{ question: string; questions?: string[] }> {
  return apiRequest('/dashboard/company-intake/follow-up-question', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateCompanyIntakeLearningSummary(data: {
  company_name: string;
  company_segment: string;
  company_description: string;
  conversation: Array<{
    question: string;
    answer: string;
  }>;
}): Promise<{ summary: string }> {
  return apiRequest('/dashboard/company-intake/learning-summary', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getConversations(): Promise<Conversation[]> {
  return apiRequest('/conversations');
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return apiRequest(`/conversations/${id}`);
}

export async function getConversationMessages(id: string): Promise<Message[]> {
  return apiRequest(`/conversations/${id}/messages`);
}

export async function replyToConversation(id: string, text: string) {
  return apiRequest<{ success: true; message: Message }>(`/conversations/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function updateConversationStatus(id: string, status: Conversation['status']) {
  return apiRequest<Conversation>(`/conversations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateConversationBot(id: string, enabled: boolean) {
  return apiRequest<Conversation>(`/conversations/${id}/bot`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function getBotConfig(): Promise<BotConfig> {
  return apiRequest('/bot-config');
}

export async function getImageGenerationUsage(): Promise<ImageGenerationUsage> {
  return apiRequest('/bot-config/image-generation-usage');
}

export async function updateBotConfig(data: BotConfig): Promise<BotConfig> {
  return apiRequest('/bot-config', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function generateBotConfigFieldSuggestion(data: { field: string; botConfig: BotConfig }): Promise<{ field: string; suggestion: string; cached?: boolean }> {
  return apiRequest('/bot-config/suggest-field', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateBotTestResponse(data: BotConfig, userMessage: string, conversationContext?: string, simulationId?: string, attachment?: SimulationAttachment) {
  const payload = await apiRequest<{ response: string; simulationId: string; log: SimulationLog }>('/bot-config/test', {
    method: 'POST',
    body: JSON.stringify({ botConfig: data, message: userMessage, conversationContext, simulationId, attachment }),
  });

  return payload;
}

export async function getSimulationLogs(): Promise<SimulationLog[]> {
  return apiRequest('/simulation-logs');
}

export async function askBella(message: string, conversationContext: Array<{ role: 'user' | 'assistant'; text: string }>) {
  return apiRequest<{ response: string }>('/panel-assistant/message', {
    method: 'POST',
    body: JSON.stringify({ message, conversationContext }),
  });
}

export async function getKnowledge(): Promise<KnowledgeItem[]> {
  return apiRequest('/knowledge');
}

export async function createKnowledge(item: Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>) {
  return apiRequest<KnowledgeItem>('/knowledge', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateKnowledge(id: string, updates: Partial<KnowledgeItem>) {
  return apiRequest<KnowledgeItem>(`/knowledge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteKnowledge(id: string) {
  return apiRequest<{ success: true }>(`/knowledge/${id}`, {
    method: 'DELETE',
  });
}

export async function getKnowledgeFiles(): Promise<KnowledgeFile[]> {
  return apiRequest('/knowledge-files');
}

export async function createKnowledgeFile(file: KnowledgeFileUpload) {
  return apiRequest<KnowledgeFile>('/knowledge-files', {
    method: 'POST',
    body: JSON.stringify(file),
  });
}

export async function updateKnowledgeFile(id: string, updates: Partial<Pick<KnowledgeFile, 'title' | 'description' | 'content_description' | 'extracted_text' | 'active'>>) {
  return apiRequest<KnowledgeFile>(`/knowledge-files/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteKnowledgeFile(id: string) {
  return apiRequest<{ success: true }>(`/knowledge-files/${id}`, {
    method: 'DELETE',
  });
}

export async function getKnowledgeFileUrl(id: string) {
  return apiRequest<{ url: string }>(`/knowledge-files/${id}/url`);
}

export async function getKnowledgeSources(): Promise<KnowledgeSource[]> {
  return apiRequest('/knowledge-sources');
}

export async function getKnowledgeStatus(): Promise<KnowledgeStatus> {
  return apiRequest('/knowledge-status');
}

export async function previewKnowledgeDescriptionAudio(input: {
  audio: KnowledgeDescriptionAudio;
  target: 'file' | 'link';
  title?: string;
  file_name?: string;
}): Promise<KnowledgeDescriptionAudioPreview> {
  return apiRequest('/knowledge-description-audio/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createKnowledgeSource(source: KnowledgeSourceInput) {
  return apiRequest<KnowledgeSource>('/knowledge-sources', {
    method: 'POST',
    body: JSON.stringify(source),
  });
}

export async function updateKnowledgeSource(id: string, updates: Partial<Pick<KnowledgeSource, 'title' | 'source_type' | 'url' | 'description' | 'content_description' | 'extracted_text' | 'active'>>) {
  return apiRequest<KnowledgeSource>(`/knowledge-sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function syncKnowledgeSource(id: string) {
  return apiRequest<KnowledgeSource>(`/knowledge-sources/${id}/sync`, {
    method: 'POST',
  });
}

export async function deleteKnowledgeSource(id: string) {
  return apiRequest<{ success: true }>(`/knowledge-sources/${id}`, {
    method: 'DELETE',
  });
}

export async function getProductItems(): Promise<ProductItem[]> {
  return apiRequest('/product-items');
}

export async function createProductItem(item: ProductItemInput) {
  return apiRequest<ProductItem>('/product-items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateProductItem(id: string, updates: Partial<ProductItemInput>) {
  return apiRequest<ProductItem>(`/product-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteProductItem(id: string) {
  return apiRequest<{ success: true }>(`/product-items/${id}`, {
    method: 'DELETE',
  });
}

export async function importProductItems(input: ProductImportInput) {
  return apiRequest<{ imported: number; items: ProductItem[] }>('/product-items/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function previewProductItemsImport(input: ProductImportInput) {
  return apiRequest<ProductImportPreview>('/product-items/preview-import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getIntegrationConnections(): Promise<IntegrationConnection[]> {
  return apiRequest('/integrations');
}

export async function createIntegrationConnection(input: IntegrationInput) {
  return apiRequest<IntegrationConnection>('/integrations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateIntegrationConnection(id: string, updates: Partial<IntegrationInput>) {
  return apiRequest<IntegrationConnection>(`/integrations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  return apiRequest('/automation-rules');
}

export async function createAutomationRule(input: AutomationRuleInput) {
  return apiRequest<AutomationRule>('/automation-rules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRuleInput>) {
  return apiRequest<AutomationRule>(`/automation-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteAutomationRule(id: string) {
  return apiRequest<{ success: true }>(`/automation-rules/${id}`, {
    method: 'DELETE',
  });
}

export async function getWhatsappStatus(): Promise<WhatsAppStatus> {
  const status = await apiRequest<WhatsAppStatus & { web?: WhatsAppStatus['web'] }>('/whatsapp/status');

  return {
    ...status,
    web: status.web || {
      enabled: false,
      status: 'disconnected',
      qrCode: '',
      phoneNumber: '',
      lastError: '',
      connectedAt: '',
      disconnectedAt: '',
      sendDelayMs: 2500,
      reconnecting: false,
      warning: 'WhatsApp Web não garante 100% de uptime. Use monitoramento e reconecte quando necessário.',
    },
  };
}

export async function startWhatsappWeb(): Promise<WhatsAppStatus['web']> {
  return apiRequest('/whatsapp-web/start', {
    method: 'POST',
  });
}

export async function disconnectWhatsappWeb(): Promise<WhatsAppStatus['web']> {
  return apiRequest('/whatsapp-web/disconnect', {
    method: 'POST',
  });
}

export async function testWhatsappWebMessage(to: string, message: string) {
  return apiRequest<{ success: true; to: string; queuedDelayMs: number }>('/whatsapp-web/test-message', {
    method: 'POST',
    body: JSON.stringify({ to, message }),
  });
}

export async function getWhatsappDisconnectEvents(): Promise<WhatsAppDisconnectEvent[]> {
  return apiRequest('/whatsapp/disconnect-events');
}

export async function getSettings(): Promise<Settings> {
  return apiRequest('/settings');
}

export async function updateSettings(data: Settings): Promise<Settings> {
  return apiRequest('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
