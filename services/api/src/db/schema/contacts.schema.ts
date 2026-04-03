import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const contactTypeEnum = pgEnum('contact_type', ['LEAD', 'CLIENT', 'PARTNER']);
export const contactSourceEnum = pgEnum('contact_source', [
  'REFERRAL', 'LINKEDIN', 'INSTAGRAM', 'COLD_OUTREACH',
  'WEBSITE', 'WHATSAPP_INBOUND', 'OTHER',
]);

export const contacts = pgTable('contacts', {
  id:         uuid('id').primaryKey().defaultRandom(),
  type:       contactTypeEnum('type').notNull().default('LEAD'),
  name:       varchar('name', { length: 255 }).notNull(),
  company:    varchar('company', { length: 255 }),
  email:      varchar('email', { length: 255 }),
  phone:      varchar('phone', { length: 20 }),
  website:    varchar('website', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  source:     contactSourceEnum('source').default('OTHER'),
  tags:       text('tags').array().default([]),
  notes:      text('notes'),
  metadata:   jsonb('metadata').default({}),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT',
  'NEGOTIATION', 'WON', 'LOST',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'NOTE', 'WHATSAPP_IN', 'WHATSAPP_OUT', 'EMAIL',
  'CALL', 'MEETING', 'STAGE_CHANGE', 'SYSTEM',
]);

export const leadPipeline = pgTable('lead_pipeline', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  contactId:           uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  stage:               pipelineStageEnum('stage').notNull().default('NEW'),
  estimatedValue:      text('estimated_value'), // decimal como string para evitar float issues
  currency:            varchar('currency', { length: 3 }).notNull().default('BRL'),
  lostReason:          varchar('lost_reason', { length: 500 }),
  nextFollowUpAt:      timestamp('next_follow_up_at', { withTimezone: true }),
  assignedProposalId:  uuid('assigned_proposal_id'),
  priority:            text('priority').default('3'),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable('activities', {
  id:        uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  type:      activityTypeEnum('type').notNull(),
  content:   text('content').notNull(),
  metadata:  jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
