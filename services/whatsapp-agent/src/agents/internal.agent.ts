import Anthropic from '@anthropic-ai/sdk';
import { sendText } from '../evolution.client';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MY_INSTANCE = process.env.EVOLUTION_MY_INSTANCE ?? 'thiago-personal';
const MY_PHONE = process.env.EVOLUTION_MY_PHONE ?? '';
const API_URL = process.env.API_URL ?? 'http://api:3001';
const WEBHOOK_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? '';

const SYSTEM_PROMPT = `Você é o assistente interno do Thiago Silva, fundador da ThiagoMKT Tecnologia.
Você interpreta comandos enviados via WhatsApp e executa ações no sistema (CRM, projetos, conteúdo).

COMANDOS DISPONÍVEIS e como interpretar:

1. "novo lead: [nome] | [empresa] | [telefone] | [notas]"
   → Extrai dados e chama a API para criar lead

2. "qualificar [nome ou telefone]"
   → Busca o contato e chama o agente de qualificação

3. "escrever post sobre [tópico]"
   → Chama o agente de conteúdo

4. "status pipeline"
   → Retorna resumo do funil de vendas

5. "briefing"
   → Retorna resumo: leads a seguir, faturas pendentes, milestones atrasados

6. "timer [Xh] projeto [nome do projeto]"
   → Registra horas no projeto

Para qualquer mensagem, interprete e responda COM AÇÕES EXECUTADAS ou INFORMAÇÕES DIRETAS.
Seja conciso — é uma mensagem de WhatsApp, não um e-mail.
Sempre confirme o que foi feito.`;

async function callInternalApi(endpoint: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': WEBHOOK_SECRET,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function processInternalMessage(
  conversationId: string,
  messageContent: string,
  contextSummary?: string,
): Promise<void> {
  // Processa comando com Claude
  const userMessage = contextSummary
    ? `Contexto da conversa:\n${contextSummary}\n\nNova mensagem: ${messageContent}`
    : messageContent;

  const response = await anthropic.messages.create({
    model: process.env.AI_FAST_MODEL ?? 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const aiText = (response.content[0] as Anthropic.TextBlock).text;

  // Detecta e executa ações
  await executeActions(messageContent, aiText);

  // Envia resposta para o Thiago
  await sendText(MY_INSTANCE, MY_PHONE, aiText);
}

async function executeActions(userMessage: string, aiResponse: string): Promise<void> {
  const lower = userMessage.toLowerCase();

  // Cria lead a partir de "novo lead: nome | empresa | telefone | notas"
  if (lower.startsWith('novo lead:')) {
    const parts = userMessage.replace(/novo lead:/i, '').split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      try {
        await callInternalApi('/crm/leads', 'POST', {
          name: parts[0],
          company: parts[1] ?? undefined,
          phone: parts[2]?.replace(/\D/g, '') ?? undefined,
          notes: parts[3] ?? undefined,
          source: 'WHATSAPP_INBOUND',
        });
      } catch (err) {
        console.error('[Internal Agent] Erro ao criar lead:', err);
      }
    }
  }

  // Status do pipeline
  if (lower.includes('status pipeline') || lower.includes('pipeline')) {
    try {
      const result = await callInternalApi('/crm/pipeline/summary', 'GET');
      const summary = result?.data?.map((s: { stage: string; count: number; total_value: string }) =>
        `${s.stage}: ${s.count} leads (R$${Number(s.total_value).toLocaleString('pt-BR')})`
      ).join('\n');
      if (summary) {
        await sendText(MY_INSTANCE, MY_PHONE, `📊 Pipeline:\n${summary}`);
      }
    } catch (err) {
      console.error('[Internal Agent] Erro ao buscar pipeline:', err);
    }
  }
}
