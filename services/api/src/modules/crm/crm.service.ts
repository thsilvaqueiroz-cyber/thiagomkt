import { z } from 'zod';
import * as repo from './crm.repository';

export const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['LEAD', 'CLIENT', 'PARTNER']).default('LEAD'),
  company: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  source: z.enum(['REFERRAL', 'LINKEDIN', 'INSTAGRAM', 'COLD_OUTREACH', 'WEBSITE', 'WHATSAPP_INBOUND', 'OTHER']).optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  estimatedValue: z.number().positive().optional(),
});

export const updatePipelineStageSchema = z.object({
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']),
  estimatedValue: z.number().positive().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  lostReason: z.string().optional(),
});

export async function getLeads(stage?: string) {
  return repo.listLeads(stage);
}

export async function getContact(id: string) {
  const data = await repo.getContactWithPipeline(id);
  if (!data) throw new Error('Contato não encontrado');
  return data;
}

export async function createLead(input: z.infer<typeof createContactSchema>) {
  const { estimatedValue, ...contactData } = input;

  const contact = await repo.createContact({
    ...contactData,
    type: input.type,
  });

  const pipeline = await repo.upsertPipeline(contact.id, {
    stage: 'NEW',
    estimatedValue: estimatedValue ? String(estimatedValue) : undefined,
  });

  await repo.createActivity({
    contactId: contact.id,
    type: 'SYSTEM',
    content: `Lead criado via ${input.source ?? 'sistema'}`,
  });

  return { contact, pipeline };
}

export async function updateStage(
  contactId: string,
  input: z.infer<typeof updatePipelineStageSchema>,
  previousStage?: string,
) {
  const pipeline = await repo.upsertPipeline(contactId, {
    stage: input.stage,
    estimatedValue: input.estimatedValue ? String(input.estimatedValue) : undefined,
    nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined,
    lostReason: input.lostReason,
  });

  await repo.createActivity({
    contactId,
    type: 'STAGE_CHANGE',
    content: `Estágio alterado: ${previousStage ?? '?'} → ${input.stage}`,
    metadata: { previousStage, newStage: input.stage },
  });

  return pipeline;
}

export async function addNote(contactId: string, content: string) {
  return repo.createActivity({
    contactId,
    type: 'NOTE',
    content,
  });
}

export async function getContactActivities(contactId: string) {
  return repo.getActivitiesByContact(contactId);
}

export async function getPipelineSummary() {
  return repo.getPipelineSummary();
}
