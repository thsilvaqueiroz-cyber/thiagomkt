import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  smallint,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { contacts } from './contacts.schema';

export const proposalStatusEnum = pgEnum('proposal_status', [
  'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED',
]);

export const proposals = pgTable('proposals', {
  id:          uuid('id').primaryKey().defaultRandom(),
  contactId:   uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 500 }).notNull(),
  content:     text('content').notNull(),
  value:       text('value').notNull(),
  currency:    varchar('currency', { length: 3 }).notNull().default('BRL'),
  status:      proposalStatusEnum('status').notNull().default('DRAFT'),
  validUntil:  date('valid_until'),
  sentAt:      timestamp('sent_at', { withTimezone: true }),
  viewedAt:    timestamp('viewed_at', { withTimezone: true }),
  acceptedAt:  timestamp('accepted_at', { withTimezone: true }),
  rejectedAt:  timestamp('rejected_at', { withTimezone: true }),
  aiGenerated: boolean('ai_generated').default(false),
  notes:       text('notes'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const projectStatusEnum = pgEnum('project_status', [
  'SCOPING', 'IN_PROGRESS', 'REVIEW', 'DELIVERED', 'MAINTENANCE', 'CANCELLED',
]);

export const projectTypeEnum = pgEnum('project_type', [
  'AI_AGENT', 'AUTOMATION', 'WHATSAPP_SERVICE', 'CONSULTING', 'OTHER',
]);

export const projects = pgTable('projects', {
  id:              uuid('id').primaryKey().defaultRandom(),
  contactId:       uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'restrict' }),
  proposalId:      uuid('proposal_id').references(() => proposals.id, { onDelete: 'set null' }),
  name:            varchar('name', { length: 500 }).notNull(),
  description:     text('description'),
  type:            projectTypeEnum('type').notNull().default('OTHER'),
  status:          projectStatusEnum('status').notNull().default('SCOPING'),
  contractedValue: text('contracted_value'),
  currency:        varchar('currency', { length: 3 }).notNull().default('BRL'),
  startDate:       date('start_date'),
  deadline:        date('deadline'),
  deliveredAt:     timestamp('delivered_at', { withTimezone: true }),
  repositoryUrl:   varchar('repository_url', { length: 500 }),
  notes:           text('notes'),
  metadata:        jsonb('metadata').default({}),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE',
]);

export const milestones = pgTable('milestones', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  dueDate:     date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status:      milestoneStatusEnum('status').notNull().default('PENDING'),
  orderIndex:  smallint('order_index').default(0),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const timeEntries = pgTable('time_entries', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  hours:       text('hours').notNull(),
  loggedAt:    date('logged_at').notNull().default('now()' as unknown as string),
  billable:    boolean('billable').default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
