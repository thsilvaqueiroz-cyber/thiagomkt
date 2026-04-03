import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().default('3001').transform(Number),

  // Supabase
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://redis:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),
  AI_DEFAULT_MODEL: z.string().default('claude-sonnet-4-6'),
  AI_FAST_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  AI_MAX_MONTHLY_BUDGET_USD: z.string().default('100').transform(Number),

  // Evolution API
  EVOLUTION_API_URL: z.string().url().default('http://evolution-api:8080'),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_MY_INSTANCE: z.string().min(1),
  EVOLUTION_MY_PHONE: z.string().min(1),

  // Segredos internos
  INTERNAL_WEBHOOK_SECRET: z.string().min(1),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
