import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { db } from '../db/client';
import { aiAgentRuns } from '../db/schema';
import { getCache, setCache } from '../lib/redis';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Preços por 1M tokens (USD) — atualizar conforme tabela da Anthropic
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':          { input: 3.0,   output: 15.0 },
  'claude-haiku-4-5-20251001':  { input: 0.25,  output: 1.25 },
  'claude-opus-4-6':            { input: 15.0,  output: 75.0 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-6'];
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export interface ClaudeCallOptions {
  agentType: 'PROPOSAL_WRITER' | 'CONTENT_WRITER' | 'LEAD_QUALIFIER' | 'WHATSAPP_RESPONDER' | 'PROJECT_ASSISTANT' | 'DAILY_BRIEFING';
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  referenceId?: string;
  referenceType?: string;
  inputContext?: Record<string, unknown>;
  cacheKey?: string;        // Se definido, tenta cache Redis antes de chamar a API
  cacheTtl?: number;        // TTL em segundos (padrão: 3600)
}

export interface ClaudeResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: string;
  runId: string;
}

export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeResponse> {
  const model = options.model ?? env.AI_DEFAULT_MODEL;

  // Cache check
  if (options.cacheKey) {
    const cached = await getCache<ClaudeResponse>(options.cacheKey);
    if (cached) return cached;
  }

  const startTime = Date.now();
  let success = true;
  let errorMessage: string | undefined;
  let response: Anthropic.Message | undefined;

  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userMessage }],
    });
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const durationMs = Date.now() - startTime;
    const inputTokens = response?.usage.input_tokens ?? 0;
    const outputTokens = response?.usage.output_tokens ?? 0;
    const costUsd = calculateCost(model, inputTokens, outputTokens);

    const [run] = await db.insert(aiAgentRuns).values({
      agentType: options.agentType,
      inputContext: options.inputContext ?? {},
      output: success && response ? (response.content[0] as Anthropic.TextBlock).text : null,
      model,
      inputTokens,
      outputTokens,
      costUsd: String(costUsd),
      durationMs,
      success,
      error: errorMessage,
      referenceId: options.referenceId,
      referenceType: options.referenceType,
    }).returning();

    if (success && response && run) {
      const result: ClaudeResponse = {
        content: (response.content[0] as Anthropic.TextBlock).text,
        inputTokens,
        outputTokens,
        costUsd,
        model,
        runId: run.id,
      };

      if (options.cacheKey) {
        await setCache(options.cacheKey, result, options.cacheTtl ?? 3600);
      }

      return result;
    }
  }

  throw new Error('Claude call failed without throwing');
}
