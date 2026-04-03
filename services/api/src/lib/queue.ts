import { Queue, Worker, QueueEvents } from 'bullmq';
import { env } from '../config/env';

const connection = {
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD || undefined,
};

// ── Filas ──────────────────────────────────────────────────

export const whatsappQueue = new Queue('whatsapp:process', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  },
});

export const aiQueue = new Queue('ai:tasks', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800 },
  },
});

export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

// ── Tipos de jobs ──────────────────────────────────────────

export interface WhatsappJobData {
  conversationId: string;
  messageId: string;
  instanceId: string;
  contactPhone: string;
  content: string;
  messageType: string;
}

export interface AiJobData {
  agentType: string;
  referenceId?: string;
  referenceType?: string;
  context: Record<string, unknown>;
  callbackQueue?: string;
}

export interface NotificationJobData {
  type: 'WHATSAPP' | 'EMAIL';
  to: string;
  content: string;
  instanceId?: string;
}

export { Worker, QueueEvents };
