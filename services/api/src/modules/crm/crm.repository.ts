import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  contacts, leadPipeline, activities,
  type pipelineStageEnum,
} from '../../db/schema';

export async function listLeads(stage?: string) {
  const query = db
    .select({
      contact: contacts,
      pipeline: leadPipeline,
    })
    .from(contacts)
    .leftJoin(leadPipeline, eq(leadPipeline.contactId, contacts.id))
    .where(
      stage
        ? eq(leadPipeline.stage, stage as (typeof pipelineStageEnum.enumValues)[number])
        : undefined
    )
    .orderBy(desc(leadPipeline.updatedAt));
  return query;
}

export async function getContactById(id: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  return contact ?? null;
}

export async function getContactWithPipeline(id: string) {
  const [row] = await db
    .select({ contact: contacts, pipeline: leadPipeline })
    .from(contacts)
    .leftJoin(leadPipeline, eq(leadPipeline.contactId, contacts.id))
    .where(eq(contacts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createContact(data: typeof contacts.$inferInsert) {
  const [created] = await db.insert(contacts).values(data).returning();
  return created;
}

export async function updateContact(id: string, data: Partial<typeof contacts.$inferInsert>) {
  const [updated] = await db
    .update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();
  return updated ?? null;
}

export async function upsertPipeline(contactId: string, data: Partial<typeof leadPipeline.$inferInsert>) {
  const existing = await db
    .select()
    .from(leadPipeline)
    .where(eq(leadPipeline.contactId, contactId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(leadPipeline)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leadPipeline.contactId, contactId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(leadPipeline)
    .values({ contactId, ...data })
    .returning();
  return created;
}

export async function createActivity(data: typeof activities.$inferInsert) {
  const [created] = await db.insert(activities).values(data).returning();
  return created;
}

export async function getActivitiesByContact(contactId: string, limit = 50) {
  return db
    .select()
    .from(activities)
    .where(eq(activities.contactId, contactId))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

export async function getPipelineSummary() {
  const result = await db.execute(sql`
    SELECT
      lp.stage,
      COUNT(*) as count,
      COALESCE(SUM(lp.estimated_value::numeric), 0) as total_value
    FROM lead_pipeline lp
    GROUP BY lp.stage
    ORDER BY
      CASE lp.stage
        WHEN 'NEW' THEN 1
        WHEN 'CONTACTED' THEN 2
        WHEN 'QUALIFIED' THEN 3
        WHEN 'PROPOSAL_SENT' THEN 4
        WHEN 'NEGOTIATION' THEN 5
        WHEN 'WON' THEN 6
        WHEN 'LOST' THEN 7
      END
  `);
  return result.rows;
}
