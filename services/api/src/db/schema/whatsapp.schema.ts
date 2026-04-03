import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { contacts } from './contacts.schema';

export const waConversationModeEnum = pgEnum('wa_conversation_mode', [
  'INTERNAL_ASSISTANT',
  'LEAD_QUALIFIER',
  'CLIENT_DEMO',
  'MANUAL',
]);

export const waMessageDirectionEnum = pgEnum('wa_message_direction', ['INBOUND', 'OUTBOUND']);

export const waMessageTypeEnum = pgEnum('wa_message_type', [
  'TEXT', 'AUDIO', 'IMAGE', 'DOCUMENT', 'VIDEO',
  'STICKER', 'BUTTON_REPLY', 'LIST_REPLY', 'REACTION',
]);

export const whatsappConversations = pgTable('whatsapp_conversations', {
  id:             uuid('id').primaryKey().defaultRandom(),
  instanceId:     varchar('instance_id', { length: 100 }).notNull(),
  contactPhone:   varchar('contact_phone', { length: 20 }).notNull(),
  contactId:      uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  mode:           waConversationModeEnum('mode').notNull().default('LEAD_QUALIFIER'),
  aiEnabled:      boolean('ai_enabled').default(true),
  aiPausedUntil:  timestamp('ai_paused_until', { withTimezone: true }),
  lastMessageAt:  timestamp('last_message_at', { withTimezone: true }),
  contextSummary: text('context_summary'),
  metadata:       jsonb('metadata').default({}),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueInstancePhone: unique().on(t.instanceId, t.contactPhone),
}));

export const whatsappMessages = pgTable('whatsapp_messages', {
  id:              uuid('id').primaryKey().defaultRandom(),
  conversationId:  uuid('conversation_id').notNull().references(() => whatsappConversations.id, { onDelete: 'cascade' }),
  direction:       waMessageDirectionEnum('direction').notNull(),
  content:         text('content'),
  mediaUrl:        varchar('media_url', { length: 1000 }),
  messageType:     waMessageTypeEnum('message_type').notNull().default('TEXT'),
  evolutionMsgId:  varchar('evolution_msg_id', { length: 200 }).unique(),
  processedByAi:   boolean('processed_by_ai').default(false),
  aiRunId:         uuid('ai_run_id'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
