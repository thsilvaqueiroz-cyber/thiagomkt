import { callClaude } from '../claude.client';
import { db } from '../../db/client';
import { contacts, leadPipeline, activities } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const SYSTEM_PROMPT = `Você é um consultor de vendas especializado em qualificar leads de tecnologia (IA, automação, WhatsApp).

Analise as informações do lead e retorne uma avaliação estruturada em JSON.

CRITÉRIOS DE QUALIFICAÇÃO (BANT):
- Budget: Tem orçamento para investir? (R$2k-R$20k faixa típica)
- Authority: É o decisor ou tem acesso ao decisor?
- Need: Tem uma dor real que nossa solução resolve?
- Timeline: Tem urgência ou prazo definido?

Retorne APENAS um JSON válido com esta estrutura:
{
  "score": <número de 1 a 10>,
  "recommendation": "QUALIFICAR_AGORA" | "NUTRIR" | "DESCARTAR",
  "budget": { "assessment": "alto/médio/baixo/desconhecido", "reasoning": "..." },
  "authority": { "isDecisionMaker": true/false/null, "reasoning": "..." },
  "need": { "urgency": "alta/média/baixa", "mainPain": "..." },
  "timeline": { "urgency": "imediata/próximos30dias/futuro/desconhecido", "reasoning": "..." },
  "nextAction": "Descrição da ação recomendada para o próximo contato",
  "suggestedMessage": "Mensagem WhatsApp de follow-up (máx 200 caracteres)"
}`;

export async function qualifyLead(contactId: string): Promise<Record<string, unknown>> {
  const [contactRow] = await db
    .select({ contact: contacts, pipeline: leadPipeline })
    .from(contacts)
    .leftJoin(leadPipeline, eq(leadPipeline.contactId, contacts.id))
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contactRow) throw new Error('Lead não encontrado');

  const recentActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.contactId, contactId))
    .orderBy(desc(activities.createdAt))
    .limit(20);

  const { contact, pipeline } = contactRow;

  const activityLog = recentActivities
    .map((a) => `[${a.type}] ${a.content}`)
    .join('\n');

  const userMessage = `
Lead para qualificar:

Nome: ${contact.name}
Empresa: ${contact.company ?? 'Não informado'}
Segmento: ${contact.tags?.join(', ') ?? 'Não informado'}
Telefone: ${contact.phone ?? 'Não informado'}
Fonte: ${contact.source ?? 'Não informado'}
Estágio atual: ${pipeline?.stage ?? 'NEW'}
Valor estimado: R$ ${pipeline?.estimatedValue ?? 'Não definido'}
Próximo follow-up: ${pipeline?.nextFollowUpAt?.toString() ?? 'Não definido'}
Notas do contato: ${contact.notes ?? 'Nenhuma'}

Histórico de atividades:
${activityLog || 'Nenhuma atividade registrada ainda'}
  `.trim();

  const result = await callClaude({
    agentType: 'LEAD_QUALIFIER',
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    model: process.env.AI_FAST_MODEL,
    maxTokens: 1000,
    referenceId: contactId,
    referenceType: 'contact',
    inputContext: { contactId },
    cacheKey: `lead-qualify:${contactId}:${recentActivities[0]?.createdAt?.getTime() ?? 0}`,
    cacheTtl: 1800, // 30 min
  });

  try {
    const qualification = JSON.parse(result.content) as Record<string, unknown>;

    // Salva resumo como atividade
    await db.insert(activities).values({
      contactId,
      type: 'SYSTEM',
      content: `Qualificação IA: Score ${qualification.score}/10 — ${qualification.recommendation}`,
      metadata: { qualification, aiRunId: result.runId },
    });

    return qualification;
  } catch {
    throw new Error('Resposta da IA com formato inválido');
  }
}
