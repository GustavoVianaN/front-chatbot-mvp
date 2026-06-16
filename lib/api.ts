'use server';

import type {
  BotConfig,
  Conversation,
  DashboardSummary,
  KnowledgeItem,
  Message,
  Settings,
  WhatsAppStatus,
} from './types';

const DEFAULT_BACKEND_API_URL = 'http://localhost:3000/api';

function getBackendApiUrl() {
  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL).replace(/\/$/, '');
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBackendApiUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Backend request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
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

export async function generateBotTestResponse(data: BotConfig, userMessage: string) {
  const payload = await apiRequest<{ response: string }>('/bot-config/test', {
    method: 'POST',
    body: JSON.stringify({ botConfig: data, message: userMessage }),
  });

  return payload.response;
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
