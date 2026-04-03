import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processInternalMessage } from './agents/internal.agent';
import { processLeadMessage } from './agents/lead.agent';
import { processDemoMessage } from './agents/demo.agent';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://redis:6379';
const MY_INSTANCE = process.env.EVOLUTION_MY_INSTANCE ?? 'thiago-personal';

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

interface WhatsappJob {
  conversationId: string;
  messageId: string;
  instanceId: string;
  contactPhone: string;
  content: string;
  messageType: string;
}

interface ConversationData {
  mode: string;
  contextSummary?: string;
}

async function getConversationData(conversationId: string): Promise<ConversationData | null> {
  const API_URL = process.env.API_URL ?? 'http://api:3001';
  try {
    const res = await fetch(`${API_URL}/webhooks/conversations/${conversationId}`, {
      headers: { 'x-webhook-secret': process.env.INTERNAL_WEBHOOK_SECRET ?? '' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: ConversationData };
    return data?.data ?? null;
  } catch {
    return null;
  }
}

const worker = new Worker<WhatsappJob>(
  'whatsapp:process',
  async (job) => {
    const { conversationId, instanceId, contactPhone, content, messageType } = job.data;

    console.log(`[WhatsApp Agent] Processando mensagem — conversa ${conversationId}`);

    // Ignora mensagens de mídia sem texto por enquanto
    if (!content && messageType !== 'TEXT') {
      console.log(`[WhatsApp Agent] Ignorando mensagem de mídia sem legenda`);
      return;
    }

    // Busca dados da conversa (modo, contexto)
    const conversation = await getConversationData(conversationId);
    const mode = conversation?.mode ?? (instanceId === MY_INSTANCE ? 'INTERNAL_ASSISTANT' : 'LEAD_QUALIFIER');
    const contextSummary = conversation?.contextSummary;

    // Roteia para o agente correto
    switch (mode) {
      case 'INTERNAL_ASSISTANT':
        await processInternalMessage(conversationId, content, contextSummary);
        break;

      case 'LEAD_QUALIFIER':
        await processLeadMessage(instanceId, contactPhone, conversationId, content, contextSummary ?? null);
        break;

      case 'CLIENT_DEMO':
        await processDemoMessage(instanceId, contactPhone, conversationId, content, contextSummary ?? null);
        break;

      case 'MANUAL':
        console.log(`[WhatsApp Agent] Conversa ${conversationId} em modo MANUAL — IA pausada`);
        break;

      default:
        console.warn(`[WhatsApp Agent] Modo desconhecido: ${mode}`);
    }
  },
  {
    connection,
    concurrency: 5,
  },
);

worker.on('completed', (job) => {
  console.log(`[WhatsApp Agent] Job ${job.id} concluído`);
});

worker.on('failed', (job, err) => {
  console.error(`[WhatsApp Agent] Job ${job?.id} falhou:`, err.message);
});

console.log('✅ WhatsApp Agent iniciado — aguardando mensagens...');
