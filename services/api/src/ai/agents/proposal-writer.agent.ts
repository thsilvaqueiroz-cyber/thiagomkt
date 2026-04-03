import { callClaude } from '../claude.client';
import { db } from '../../db/client';
import { contacts, leadPipeline, activities, proposals } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface ProposalInput {
  contactId: string;
  serviceType: 'AI_AGENT' | 'AUTOMATION' | 'WHATSAPP_SERVICE' | 'CONSULTING';
  painPoints: string;
  additionalContext?: string;
}

const SYSTEM_PROMPT = `Você é um especialista em vendas de tecnologia e escreve propostas comerciais convincentes para uma empresa brasileira de IA e automação.

A empresa se chama ThiagoMKT Tecnologia e oferece:
- Agentes de IA personalizados (chatbots inteligentes para WhatsApp, atendimento 24h)
- Automações internas (processos, CRM, marketing automatizado)
- Sistemas completos integrados ao WhatsApp (agendamento, vendas, suporte)

REGRAS DA PROPOSTA:
1. Escreva em português brasileiro, tom profissional mas acessível
2. Foque nos benefícios de negócio, não em tecnologia
3. Use dados e números quando possível (ex: "reduz 80% do tempo de atendimento")
4. Inclua uma seção de ROI estimado
5. Seja específico para o segmento do cliente
6. Máximo 1500 palavras

FORMATO OBRIGATÓRIO (markdown):
# [Título da Proposta]

## Entendimento do Problema
[O que o cliente enfrenta hoje]

## Nossa Solução
[O que será entregue, de forma clara e sem jargão]

## Benefícios Esperados
[3-5 bullet points com impacto mensurável]

## Como Funciona
[Processo de implementação em 3-4 etapas]

## Timeline
[Prazo de entrega]

## Investimento
[Valor, condições de pagamento]

## Próximos Passos
[Ação clara: "Responda esta mensagem para agendar uma call de 30 minutos"]`;

export async function writeProposal(input: ProposalInput): Promise<{ proposalId: string; content: string }> {
  // Busca dados do contato
  const [contactRow] = await db
    .select({ contact: contacts, pipeline: leadPipeline })
    .from(contacts)
    .leftJoin(leadPipeline, eq(leadPipeline.contactId, contacts.id))
    .where(eq(contacts.id, input.contactId))
    .limit(1);

  if (!contactRow) throw new Error('Contato não encontrado');

  const { contact, pipeline } = contactRow;

  const serviceLabels = {
    AI_AGENT: 'Agente de IA para WhatsApp',
    AUTOMATION: 'Automação de Processos Internos',
    WHATSAPP_SERVICE: 'Sistema Completo de Atendimento WhatsApp',
    CONSULTING: 'Consultoria em IA e Automação',
  };

  const userMessage = `
Cliente: ${contact.name}
Empresa: ${contact.company ?? 'Não informado'}
Segmento: ${contact.tags?.join(', ') ?? 'Não informado'}
Serviço solicitado: ${serviceLabels[input.serviceType]}
Valor estimado: R$ ${pipeline?.estimatedValue ?? 'A definir'}

Problemas/Dores identificadas:
${input.painPoints}

${input.additionalContext ? `Contexto adicional:\n${input.additionalContext}` : ''}

Escreva a proposta completa agora.
  `.trim();

  const result = await callClaude({
    agentType: 'PROPOSAL_WRITER',
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 3000,
    referenceId: input.contactId,
    referenceType: 'contact',
    inputContext: { contactId: input.contactId, serviceType: input.serviceType },
  });

  // Salva proposta no banco
  const [proposal] = await db.insert(proposals).values({
    contactId: input.contactId,
    title: `Proposta — ${serviceLabels[input.serviceType]} — ${contact.company ?? contact.name}`,
    content: result.content,
    value: pipeline?.estimatedValue ?? '0',
    status: 'DRAFT',
    aiGenerated: true,
  }).returning();

  // Log de atividade
  await db.insert(activities).values({
    contactId: input.contactId,
    type: 'SYSTEM',
    content: `Proposta gerada por IA: "${proposal.title}"`,
    metadata: { proposalId: proposal.id, aiRunId: result.runId },
  });

  return { proposalId: proposal.id, content: result.content };
}
