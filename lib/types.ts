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
  segment: string;
  mission: string;
  target_audience: string;
  address: string;
  website: string;
  social_links: string;
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
  message_split_mode: 'single' | 'auto' | 'sentence';
  language: string;
  formality: 'informal' | 'neutro' | 'formal';
  use_markdown: boolean;
  use_emojis: boolean;
  analyze_images: boolean;
  allow_audio_messages: boolean;
  farewell_message: string;
  max_wait_seconds: number;
  working_days: string;
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

export type KnowledgeFile = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  content_description: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  s3_bucket: string;
  s3_key: string;
  extracted_text: string;
  index_status: 'ready' | 'processing' | 'error';
  indexed_at: string;
  index_error: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type KnowledgeFileUpload = {
  title: string;
  description: string;
  content_description: string;
  content_description_audio?: KnowledgeDescriptionAudio;
  extracted_text: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  data_url: string;
  active: boolean;
};

export type KnowledgeSource = {
  id: string;
  company_id: string;
  title: string;
  source_type: string;
  url: string;
  description: string;
  content_description: string;
  extracted_text: string;
  index_status: 'ready' | 'processing' | 'error';
  indexed_at: string;
  index_error: string;
  active: boolean;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
};

export type KnowledgeSourceInput = {
  title: string;
  source_type: string;
  url: string;
  description: string;
  content_description: string;
  content_description_audio?: KnowledgeDescriptionAudio;
  active: boolean;
};

export type KnowledgeDescriptionAudio = {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  data_url: string;
};

export type KnowledgeStatus = {
  status: 'pronto' | 'processando' | 'erro';
  ready: number;
  processing: number;
  errors: number;
  total: number;
  last_indexed_at: string;
};

export type ProductItem = {
  id: string;
  company_id: string;
  item_type: 'produto' | 'serviço' | 'catalogo' | 'promocao';
  name: string;
  description: string;
  price: string;
  category: string;
  sku: string;
  image_url: string;
  source: string;
  active: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type ProductItemInput = {
  item_type: ProductItem['item_type'];
  name: string;
  description: string;
  price: string;
  category: string;
  sku: string;
  image_url: string;
  source: string;
  active: boolean;
  starts_at: string;
  ends_at: string;
};

export type ProductImportInput = {
  original_filename: string;
  mime_type: string;
  data_url: string;
  default_item_type: ProductItem['item_type'];
  source: string;
};

export type ProductImportPreviewItem = {
  row: number;
  item_type: ProductItem['item_type'];
  name: string;
  description: string;
  price: string;
  category: string;
  sku: string;
  image_url: string;
  source: string;
  valid: boolean;
  error: string;
};

export type ProductImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  items: ProductImportPreviewItem[];
  truncated: boolean;
};

export type IntegrationConnection = {
  id: string;
  company_id: string;
  provider: string;
  name: string;
  status: string;
  config: string;
  last_sync_at: string;
  last_error: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type IntegrationInput = {
  provider: string;
  name: string;
  status: string;
  config: string;
  active: boolean;
};

export type SimulationLog = {
  id: string;
  company_id: string;
  bot_config_id: string;
  user_id: string;
  simulation_id: string;
  turn_index: number;
  user_message: string;
  bot_response: string;
  conversation_context: string;
  assistant_name: string;
  company_name: string;
  created_at: string;
};

export type SimulationAttachment = {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  data_url: string;
};

export type AutomationRule = {
  id: string;
  company_id: string;
  name: string;
  trigger_type: 'cliente_bravo' | 'valor_alto' | 'palavra_especifica' | 'financeiro' | 'advogado' | 'fila_humana';
  trigger_value: string;
  action: 'encaminhar_humano' | 'marcar_prioridade' | 'responder_mensagem' | 'pausar_bot';
  department: string;
  priority: string;
  response_message: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AutomationRuleInput = Omit<AutomationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>;

export type WhatsAppDisconnectEvent = {
  id: string;
  company_id: string;
  channel: string;
  reason: string;
  status_code: number | null;
  occurred_at: string;
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

export type CompanyIntakeFile = {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  data_url: string;
  content_description: string;
};

export type CompanyIntakeInput = {
  company_text: string;
  files: CompanyIntakeFile[];
};

export type WhatsAppWebStatus = {
  enabled: boolean;
  status: 'disconnected' | 'connecting' | 'qr_pending' | 'connected';
  qrCode: string;
  phoneNumber: string;
  lastError: string;
  connectedAt: string;
  disconnectedAt: string;
  sendDelayMs: number;
  maxSendDelayMs?: number;
  reconnecting: boolean;
  warning: string;
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
  web: WhatsAppWebStatus;
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
