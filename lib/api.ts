'use server';

import { cookies } from 'next/headers';
import type {
  BotConfig,
  Conversation,
  DashboardSummary,
  KnowledgeFile,
  KnowledgeFileUpload,
  KnowledgeItem,
  Message,
  Settings,
  WhatsAppStatus,
} from './types';

const DEFAULT_BACKEND_API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = 'chatbot_admin_token';
const REFRESH_COOKIE = 'chatbot_refresh_token';

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
    throw new Error(response.status === 401 ? 'Sessão expirada.' : 'Não foi possível concluir a operação.');
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
  };

  cookieStore.set(AUTH_COOKIE, payload.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15,
  });
  cookieStore.set(REFRESH_COOKIE, payload.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return payload.token;
}

export async function login(username: string, password: string) {
  const response = await fetch(`${getBackendApiUrl()}/auth/login`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: username, password }),
  });

  if (!response.ok) {
    return { success: false, error: 'Usuário ou senha inválidos.' };
  }

  const payload = (await response.json()) as {
    token: string;
    refreshToken: string;
    user: { email: string; role: string };
  };

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, payload.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15,
  });
  cookieStore.set(REFRESH_COOKIE, payload.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

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

  if (!token) {
    return { authenticated: false };
  }

  try {
    await apiRequest('/auth/me');
    return { authenticated: true };
  } catch {
    cookieStore.delete(AUTH_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    return { authenticated: false };
  }
}

export async function getDashboard(): Promise<DashboardSummary> {
  return apiRequest('/dashboard');
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

export async function updateBotConfig(data: BotConfig): Promise<BotConfig> {
  return apiRequest('/bot-config', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function generateBotTestResponse(data: BotConfig, userMessage: string, conversationContext?: string) {
  const payload = await apiRequest<{ response: string }>('/bot-config/test', {
    method: 'POST',
    body: JSON.stringify({ botConfig: data, message: userMessage, conversationContext }),
  });

  return payload.response;
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

export async function updateKnowledgeFile(id: string, updates: Partial<Pick<KnowledgeFile, 'title' | 'description' | 'extracted_text' | 'active'>>) {
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

export async function getWhatsappStatus(): Promise<WhatsAppStatus> {
  return apiRequest('/whatsapp/status');
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
