# Bella — Frontend (`front-chatbot-mvp`)

Painel web do SaaS de atendimento via WhatsApp com IA ("Bella"). Este
arquivo existe pra qualquer IA (Claude, Codex, Cursor, etc.) entender o
projeto sem reler tudo do zero. Leia inteiro antes de mexer em qualquer
coisa; depois grep pontual em vez de reler arquivos grandes — os tamanhos
abaixo estão anotados justamente pra isso.

Repositório irmão (backend, Express+Prisma): `../chatbot-mvp` — tem seu
próprio `AGENTS.md`, com o schema de dados e as regras de negócio de
verdade. Os dois são repositórios git **separados**; este repo só fala
com o backend via HTTP (`BACKEND_API_URL` no `.env`).

## Stack

Next.js 16 (App Router), React 18, TypeScript estrito, Tailwind. Toda
chamada ao backend passa por **Server Actions** (`'use server'`) dentro de
`lib/api.ts` — não existe fetch direto ao backend a partir de componente
cliente. Sessão via cookie HttpOnly (o próprio backend seta). Build gera
imagem Next standalone (`output: 'standalone'` no `next.config.mjs`).

## Rodando localmente

```
npm install
npm run dev          # next dev --webpack, porta 3001 por padrão
npm test             # vitest, poucos testes ainda (unitários simples)
npm run type-check
npm run build        # next build --webpack
```

Precisa do backend rodando (`../chatbot-mvp`) e de `.env.local` com
`BACKEND_API_URL` apontando pra ele.

## Mapa de páginas (`app/`)

| Rota | O que é |
|---|---|
| `/welcome` | **Landing pública** (marketing + preços). É a primeira URL que um cliente novo deveria acessar, não a raiz `/`. Server Component, busca planos via `getPlans()`. |
| `/signup` | Criação de conta. **Está visualmente abaixo do resto do produto** — formulário simples, sem redirecionamento automático após criar conta, sem confirmação de senha. Candidato a melhoria antes de divulgar tráfego. |
| `/login`, `/forgot-password`, `/setup-password` | Fluxo de autenticação padrão. |
| `/` (raiz) | **O painel principal, autenticado** — `app/page.tsx`, ~3600 linhas, o maior arquivo do repo. Contém: dashboard, config do bot, base de conhecimento, conversas (inbox com resposta manual + toggle liga/desliga bot), status do WhatsApp, configurações, **e o onboarding guiado** (não é uma rota separada — é um modo dentro deste componente, ativado quando `currentUser.onboardingCompleted === false`). |
| `/account` | Plano/assinatura, uso do mês, botão "Pagar com cartão" (Stripe) e "Pagar manualmente (PIX)". **Sem link direto no menu principal** — só se chega via Configurações → "Gerenciar conta". |
| `/legal/privacy`, `/legal/terms` | Páginas LGPD/termos, conteúdo real (não placeholder). |
| `app/meta-embedded-signup/` | Pasta vazia, resquício/placeholder — sem `page.tsx`. Ignorar até virar algo. |
| `app/api/auth/*`, `app/api/realtime/session` | Route handlers do Next (não confundir com o backend Express) — usados pelo fluxo de voz em tempo real (WebRTC/Realtime API da OpenAI) e por login/registro/recuperação de senha via API route em vez de Server Action. |

## `app/page.tsx` (~3600 linhas) — como navegar sem ler tudo

É o componente `Home()`. Estado gigante em `useState`/`useRef` no topo;
sessões lógicas dão pra identificar pelo prefixo do nome de variável:

- `onboarding*` / `companyGuided*` / `companyIntake*` — o assistente de
  onboarding conversacional (pergunta de abertura por segmento + 4
  perguntas reativas + fase de itens essenciais). Ver comentários no
  próprio arquivo, tem explicação de "Fase 1"/"Fase 2".
- `realtime*` — voz em tempo real (WebRTC + OpenAI Realtime API). Hoje
  **desligado da experiência de lançamento** por flag:
  `REALTIME_VOICE_ENABLED = false` (perto do topo do arquivo) — o código
  continua ali, só não é oferecido ao usuário ainda.
- `recordingGuidedAnswer` / `SpeechRecognition*` — voz "pergunta e
  resposta" via Web Speech API (mais simples que o realtime acima).
- `dashboard`, `conversations`, `botConfig`, `knowledge*`, `whatsappStatus`
  — dados carregados uma vez em `loadPanel()` e mantidos em estado local.

Pra mudar algo específico: **grep pelo nome do campo/variável primeiro**
(ex: `grep -n "welcome_message" app/page.tsx`), não leia o arquivo
inteiro — ele estoura limite de leitura em uma tacada só.

## Componentes (`components/`)

`Sidebar`/`Topbar` (navegação), `ConversationList`/`ConversationPanel`/
`ContactDetails` (inbox), `BotConfigPanel`/`KnowledgeEditor` (configuração
do bot e base de conhecimento), `WhatsAppStatusPanel` (status/QR — a
seção de "API oficial Meta" está **comentada de propósito**, só o card do
WhatsApp Web fica visível hoje; não descomentar sem alinhar com o
roadmap), `SettingsPanel` (link "Gerenciar conta" → `/account`),
`BellaAssistant`, `MetricCard`, `Toast`.

## `lib/api.ts` (~660 linhas) e `lib/types.ts` (~470 linhas)

Todo Server Action que fala com o backend mora em `api.ts` — é a ÚNICA
porta de saída pro backend. Ao adicionar uma chamada nova de API: (1)
tipar a resposta em `types.ts`, (2) criar a função em `api.ts` seguindo o
padrão das vizinhas (fetch com cookie, trata 401 lançando `'Sessão
expirada.'` — todo 401 vira essa mensagem específica, é assim que o
painel detecta sessão inválida e redireciona pra `/login`).

## Backend real x local

O que existe/funciona depende de env vars configuradas **no backend**
(`chatbot-mvp/.env`), não neste repo — ex: se `STRIPE_SECRET_KEY` não
estiver setada lá, o botão de cartão em `/account` nem aparece
(`cardPaymentAvailable` vem `false` da API). Antes de investigar "por que
esse botão não aparece", checar a config do backend, não o frontend.

## Gotchas / convenções

- Comentários e texto de UI em **português do Brasil**; nomes de
  variável/função em inglês.
- Server Actions (`'use server'`) são a única forma de tocar no backend —
  nunca adicionar `fetch` direto num componente `'use client'`.
- `next.config.mjs` tem `Permissions-Policy` — se mexer em permissão de
  mic/câmera, já rolou um bug real aqui (`microphone=()` bloqueava o
  prompt do navegador antes mesmo de pedir permissão; precisa ser
  `microphone=(self)`).
- Mudança em `next.config.mjs` não hot-reload — precisa reiniciar `npm
  run dev`.
- Áudio: `MediaRecorder.mimeType` vem com sufixo de codec (ex:
  `audio/webm;codecs=opus`) — sempre normalizar (`split(';')[0]`) antes de
  comparar/validar tipo, tanto aqui quanto no backend.

## Deploy / CI-CD

`.github/workflows/ci.yml` (audit+type-check+test+build) →
`.github/workflows/deploy.yml` (dispara quando o CI passa na `main`; SSH
até host Lightsail via secrets `LIGHTSAIL_*`, sobe imagem Docker
standalone do Next). `docker-compose.yml` só tem um serviço
(`bella-frontend`), sem banco (fala com o backend por HTTP). Detalhes em
`PRODUCTION.md`.

## Riscos de produto conhecidos (não são bugs a "corrigir")

- `/signup` está abaixo do padrão visual do resto do produto (ver tabela
  acima) — primeira impressão de um cliente novo.
- WhatsApp Web (Baileys, no backend) é automação não-oficial: risco real
  de banimento do número do cliente pela Meta — comunicar isso é decisão
  de produto, não deste repo, mas afeta o que a UI promete ao cliente.
