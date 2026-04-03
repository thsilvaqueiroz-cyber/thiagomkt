import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  numeric,
} from 'drizzle-orm/pg-core';

export const aiAgentTypeEnum = pgEnum('ai_agent_type', [
  'PROPOSAL_WRITER',
  'CONTENT_WRITER',
  'LEAD_QUALIFIER',
  'WHATSAPP_RESPONDER',
  'PROJECT_ASSISTANT',
  'DAILY_BRIEFING',
]);

export const aiAgentRuns = pgTable('ai_agent_runs', {
  id:            uuid('id').primaryKey().defaultRandom(),
  agentType:     aiAgentTypeEnum('agent_type').notNull(),
  inputContext:  jsonb('input_context').notNull().default({}),
  output:        text('output'),
  model:         varchar('model', { length: 100 }).notNull(),
  inputTokens:   integer('input_tokens'),
  outputTokens:  integer('output_tokens'),
  costUsd:       numeric('cost_usd', { precision: 10, scale: 6 }),
  durationMs:    integer('duration_ms'),
  success:       boolean('success').notNull().default(true),
  error:         text('error'),
  referenceId:   uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 50 }),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
