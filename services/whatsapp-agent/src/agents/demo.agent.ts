import Anthropic from '@anthropic-ai/sdk';
import { sendText } from '../evolution.client';
import Redis from 'ioredis';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');

// Busca configuração do agente demo para uma instância específica
async function getDemoConfig(instanceId: string): Promise<{
  systemPrompt: string;
  businessName: string;
  businessType: string;
} | null> {
  const cached = await redis.get(`demo-config:${instanceId}`);
  if (cached) return JSON.parse(cached);

  // Configuração padrão para demo
  const defaultConfig = {
    systemPrompt: `Você é um assistente virtual. Seja prestativo e responda perguntas sobre o negócio.`,
    businessName: 'Empresa Demo',
    businessType: 'comercio',
  };
  return defaultConfig;
}

const DEMO_BASE_PROMPT = `Você é um assistente virtual de WhatsApp para {BUSINESS_NAME}.

{CUSTOM_PROMPT}

REGRAS:
- Seja amigável e profissional
- Respostas curtas (máx 3 linhas)
- Português brasileiro
- Se não souber responder, diga que vai verificar e chamar alguém em breve
- Não compartilhe informações de concorrentes
- Para questões muito complexas, peça o contato para um humano continuar

Histórico da conversa:`;

export async function processDemoMessage(
  instanceId: string,
  contactPhone: string,
  conversationId: string,
  messageContent: string,
  contextSummary: string | null,
): Promise<void> {
  const config = await getDemoConfig(instanceId);

  const systemPrompt = DEMO_BASE_PROMPT
    .replace('{BUSINESS_NAME}', config?.businessName ?? 'nossa empresa')
    .replace('{CUSTOM_PROMPT}', config?.systemPrompt ?? '');

  const fullSystem = contextSummary
    ? `${systemPrompt}\n${contextSummary}`
    : systemPrompt;

  try {
    const response = await anthropic.messages.create({
      model: process.env.AI_FAST_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: fullSystem,
      messages: [{ role: 'user', content: messageContent }],
    });

    const reply = (response.content[0] as Anthropic.TextBlock).text;
    await sendText(instanceId, contactPhone, reply);
  } catch (err) {
    console.error('[Demo Agent] Erro ao processar mensagem:', err);
    await sendText(
      instanceId,
      contactPhone,
      'Olá! Tive um problema técnico momentâneo. Em breve alguém da equipe vai te atender. 😊',
    );
  }
}
