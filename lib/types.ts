export type Company = {
  id: string;
  name: string;
  whatsapp_phone_number_id: string;
  created_at: string;
  updated_at: string;
};

export type BotConfig = {
  id: string;
  company_id: string;
  assistant_name: string;
  company_name: string;
  company_description: string;
  tone: string;
  instructions: string;
  knowledge_base: string;
  welcome_message: string;
  fallback_message: string;
  out_of_hours_message: string;
  business_scope: string;
  guardrails: string;
  blocked_topics: string;
  handoff_triggers: string;
  response_rules: string;
  bot_enabled: boolean;
  response_length: 'curta' | 'média' | 'detalhada';
  allow_human_handoff: boolean;
  knowledge_only: boolean;
  prompt_injection_protection: boolean;
  system_prompt_template: string;
  user_message_template: string;
  prompt_injection_patterns: string;
  prompt_injection_fallback_message: string;
  prompt_leak_patterns: string;
  prompt_leak_fallback_message: string;
  openai_error_message: string;
  knowledge_only_instruction: string;
  human_handoff_enabled_instruction: string;
  human_handoff_disabled_instruction: string;
  resume_conversation_prompt_template: string;
  resume_conversation_accepted_message: string;
  new_conversation_started_message: string;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  company_id: string;
  phone: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  company_id: string;
  contact_id: string;
  status: 'aberto' | 'resolvido';
  botEnabled: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  company?: Company;
  last_message?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'cliente' | 'bot' | 'atendente';
  text: string;
  whatsapp_message_id: string;
  created_at: string;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  category: 'Horários' | 'Preços' | 'Serviços' | 'Localização' | 'Políticas' | 'FAQ' | 'Geral';
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DashboardSummary = {
  botEnabled: boolean;
  whatsappConnected: boolean;
  todayMessages: number;
  iaResponses: number;
  openConversations: number;
  resolvedConversations: number;
  recentErrors: number;
  lastMessage: string;
  estimatedUsage: string;
};

export type WhatsAppStatus = {
  connected: boolean;
  number: string;
  phoneNumberId: string;
  webhookStatus: 'Verificado' | 'Pendente';
  lastEvent: string;
  lastMessage: string;
  tokenConfigured: boolean;
  phoneNumberConfigured: boolean;
  metaSubscription: 'Pendente' | 'Verificada';
  environment: 'produção';
};

export type Settings = {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  timezone: string;
  business_hours: string;
  out_of_hours_message: string;
  default_language: 'Português' | 'Inglês';
  email_notifications: boolean;
  rate_limit_status: 'Normal' | 'Atenção' | 'Restrito';
  last_deploy: string;
  environment: 'produção';
};
