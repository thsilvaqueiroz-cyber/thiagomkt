import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  varchar,
} from 'drizzle-orm/pg-core';

export const contentPlatformEnum = pgEnum('content_platform', [
  'LINKEDIN', 'INSTAGRAM', 'TWITTER', 'WHATSAPP_BROADCAST', 'OTHER',
]);

export const contentStatusEnum = pgEnum('content_status', [
  'IDEA', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED',
]);

export const contentPosts = pgTable('content_posts', {
  id:           uuid('id').primaryKey().defaultRandom(),
  platform:     contentPlatformEnum('platform').notNull().default('LINKEDIN'),
  content:      text('content').notNull(),
  mediaUrls:    text('media_urls').array().default([]),
  status:       contentStatusEnum('status').notNull().default('IDEA'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  publishedAt:  timestamp('published_at', { withTimezone: true }),
  aiGenerated:  boolean('ai_generated').default(false),
  sourceTopic:  varchar('source_topic', { length: 500 }),
  hookVariants: jsonb('hook_variants').default([]),
  engagement:   jsonb('engagement').default({}),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
