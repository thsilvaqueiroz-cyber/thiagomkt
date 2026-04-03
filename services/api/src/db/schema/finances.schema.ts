import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { contacts } from './contacts.schema';
import { projects } from './projects.schema';

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED',
]);

export const expenseCategoryEnum = pgEnum('expense_category', [
  'SOFTWARE', 'MARKETING', 'INFRASTRUCTURE', 'TAXES',
  'EDUCATION', 'EQUIPMENT', 'OTHER',
]);

export const invoices = pgTable('invoices', {
  id:            uuid('id').primaryKey().defaultRandom(),
  projectId:     uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  contactId:     uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'restrict' }),
  number:        varchar('number', { length: 50 }).notNull().unique(),
  amount:        text('amount').notNull(),
  currency:      varchar('currency', { length: 3 }).notNull().default('BRL'),
  status:        invoiceStatusEnum('status').notNull().default('DRAFT'),
  dueDate:       date('due_date'),
  paidAt:        timestamp('paid_at', { withTimezone: true }),
  paymentMethod: varchar('payment_method', { length: 100 }),
  paymentLink:   varchar('payment_link', { length: 500 }),
  notes:         text('notes'),
  metadata:      jsonb('metadata').default({}),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable('expenses', {
  id:          uuid('id').primaryKey().defaultRandom(),
  category:    expenseCategoryEnum('category').notNull().default('OTHER'),
  description: varchar('description', { length: 500 }).notNull(),
  amount:      text('amount').notNull(),
  currency:    varchar('currency', { length: 3 }).notNull().default('BRL'),
  date:        date('date').notNull(),
  recurring:   boolean('recurring').default(false),
  notes:       text('notes'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
