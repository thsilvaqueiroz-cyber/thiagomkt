import Anthropic from '@anthropic-ai/sdk';
import { sendText } from '../evolution.client';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_URL = process.env.API_URL ?? 'http://api:3001';
const WEBHOOK_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? '';
const MY_INSTANCE = process.env.EVOLUTION_MY_INSTANCE ?? 'thiago-personal';
const MY_PHONE = process.env.EVOLUTION_MY_PHONE ?? '';

const LEAD_QUALIFICATION_PROMPT = `Você é um assistente de atendimento da ThiagoMKT Tecnologia.
Sua função é qualificar leads de forma amigável e natural, sem parecer um robô.

A empresa oferece:
- Agentes de IA no WhatsApp para empresas (atendimento 24h, qualificação de leads, agendamentos)
- Automações de processos internos
- Sistemas completos com IA integrada

SEU OBJETIVO: Em 3-5 mensagens, descobrir:
1. Qual negócio a pessoa tem
2. Qual é a principal dor/problema
3. Se tem interesse e urgência

REGRAS:
- Máx 3 linhas por mensagem
- Tom: amigável, direto, sem jargão técnico
- Não fale de preço ainda
- Ao final, se qualificado, diga que o Thiago vai entrar em contato em breve
- Idioma: português brasileiro
- Não use * ou # para formatação

Contexto da conversa até agora:`;

export async function processLeadMessage(
  instanceId: string,
  contactPhone: string,
  conversationId: string,
  messageContent: string,
  contextSummary: string | null,
): Promise<void> {
  const systemWithContext = contextSummary
    ? `${LEAD_QUALIFICATION_PROMPT}\n${contextSummary}`
    : LEAD_QUALIFICATION_PROMPT;

  const response = await anthropic.messages.create({
    model: process.env.AI_FAST_MODEL ?? 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemWithContext,
    messages: [{ role: 'user', content: messageContent }],
  });

  const reply = (response.content[0] as Anthropic.TextBlock).text;

  await sendText(instanceId, contactPhone, reply);

  // Notifica o Thiago quando lead parece qualificado
  const qualificationKeywords = ['interesse', 'quero', 'preciso', 'urgente', 'quanto custa', 'valor'];
  const isQualified = qualificationKeywords.some((kw) => messageContent.toLowerCase().includes(kw));

  if (isQualified) {
    await sendText(
      MY_INSTANCE,
      MY_PHONE,
      `🔥 Lead quente no WhatsApp!\nTelefone: ${contactPhone}\nMensagem: "${messageContent}"\n\nResponda agora ou acesse o dashboard.`,
    );

    // Atualiza estágio para QUALIFICADO via API
    try {
      const contactRes = await fetch(`${API_URL}/crm/leads?phone=${contactPhone}`, {
        headers: { 'x-webhook-secret': WEBHOOK_SECRET },
      });
      const contactData = await contactRes.json();
      if (contactData?.data?.[0]?.contact?.id) {
        await fetch(`${API_URL}/crm/contacts/${contactData.data[0].contact.id}/stage`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': WEBHOOK_SECRET,
          },
          body: JSON.stringify({ stage: 'QUALIFIED', previousStage: 'CONTACTED' }),
        });
      }
    } catch (err) {
      console.error('[Lead Agent] Erro ao atualizar estágio:', err);
    }
  }
}
