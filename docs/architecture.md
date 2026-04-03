# Arquitetura do Ecossistema — ThiagoMKT Tecnologia

## Visão Geral

Sistema monorepo para gestão completa de uma empresa de tecnologia solo focada em IA e automação para WhatsApp.

## Stack

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Banco de dados | Supabase (PostgreSQL) | Dados, auth, storage |
| Cache/Filas | Redis + BullMQ | Cache IA, filas assíncronas |
| Backend | Node.js + Express + TypeScript | API REST central |
| ORM | Drizzle ORM | Type-safe queries |
| Frontend | Next.js 15 (App Router) | Dashboard web |
| Automações | n8n | Workflows visuais |
| WhatsApp | Evolution API | Gateway WhatsApp |
| IA | Claude (Anthropic SDK) | Agentes inteligentes |
| Proxy | Traefik v3 | Roteamento, TLS |
| Containers | Docker Compose | Orquestração local |

## Fluxo Principal de Dados

```
Mensagem WhatsApp Recebida
  → Evolution API
  → POST api/webhooks/evolution
  → Salva mensagem no banco (Supabase)
  → Publica job na fila Redis (BullMQ)
  → whatsapp-agent consome o job
  → Roteador determina modo (INTERNAL / LEAD / DEMO)
  → Claude processa e gera resposta
  → Evolution API envia resposta
  → Log de custo salvo em ai_agent_runs
```

## Serviços

### api (porta 3001)
Backend principal. Responsável por:
- CRUD de todos os módulos (CRM, projetos, finanças, conteúdo)
- Receber webhooks da Evolution API e n8n
- Expor endpoints para o dashboard
- Publicar jobs nas filas BullMQ
- Chamar Claude via `claude.client.ts`

### dashboard (porta 3000)
Frontend Next.js. Telas:
- `/dashboard` — KPIs, pipeline summary
- `/crm` — Kanban de leads
- `/projects` — Projetos e milestones
- `/finances` — Faturas e despesas
- `/content` — Calendário editorial
- `/ai` — Interface de agentes IA

### whatsapp-agent (interno)
Worker BullMQ. Processa mensagens WhatsApp:
- `INTERNAL_ASSISTANT` — Thiago comandando o sistema
- `LEAD_QUALIFIER` — Qualificação de leads inbound
- `CLIENT_DEMO` — Chatbot de clientes dos clientes
- `MANUAL` — IA pausada, conversa humana

### n8n
Workflows visuais para automações recorrentes:
- `daily-briefing` — Resumo diário às 8h
- `lead-nurture-sequence` — Follow-up automático
- `invoice-automation` — Fatura ao entregar projeto
- `new-lead-alert` — Alerta imediato de novo lead

## Banco de Dados (Supabase)

Tabelas principais:
- `contacts` — Leads e clientes
- `lead_pipeline` — Estágios do funil
- `activities` — Log de interações
- `proposals` — Propostas (escritas pelo Claude)
- `projects` — Projetos ativos
- `milestones` — Marcos de cada projeto
- `invoices` — Faturas
- `expenses` — Despesas
- `whatsapp_conversations` — Conversas WhatsApp
- `whatsapp_messages` — Mensagens individuais
- `content_posts` — Posts de marketing
- `ai_agent_runs` — Log de custos IA
