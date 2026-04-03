import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../../db/client';
import { projects, milestones, timeEntries } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { notificationQueue } from '../../lib/queue';

const router = Router();

const createProjectSchema = z.object({
  contactId: z.string().uuid(),
  proposalId: z.string().uuid().optional(),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(['AI_AGENT', 'AUTOMATION', 'WHATSAPP_SERVICE', 'CONSULTING', 'OTHER']).default('OTHER'),
  contractedValue: z.number().positive().optional(),
  currency: z.string().length(3).default('BRL'),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
});

const updateProjectStatusSchema = z.object({
  status: z.enum(['SCOPING', 'IN_PROGRESS', 'REVIEW', 'DELIVERED', 'MAINTENANCE', 'CANCELLED']),
});

// GET /projects
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));
    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const projectMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, req.params.id))
      .orderBy(milestones.orderIndex);

    res.json({ data: { ...project, milestones: projectMilestones } });
  } catch (err) { next(err); }
});

// POST /projects
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createProjectSchema.parse(req.body);
    const [project] = await db.insert(projects).values({
      ...input,
      contractedValue: input.contractedValue ? String(input.contractedValue) : undefined,
    }).returning();
    res.status(201).json({ data: project });
  } catch (err) { next(err); }
});

// PATCH /projects/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = updateProjectStatusSchema.parse(req.body);
    const [updated] = await db
      .update(projects)
      .set({ status, updatedAt: new Date(), deliveredAt: status === 'DELIVERED' ? new Date() : undefined })
      .where(eq(projects.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Projeto não encontrado' });

    // Quando entregue, dispara automação de fatura via n8n
    if (status === 'DELIVERED') {
      await notificationQueue.add('project-delivered', {
        type: 'WHATSAPP',
        to: 'INTERNAL',
        content: `Projeto "${updated.name}" marcado como ENTREGUE. Iniciando geração de fatura...`,
      });
    }

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// POST /projects/:id/milestones
router.post('/:id/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, dueDate, orderIndex } = req.body;
    const [milestone] = await db.insert(milestones).values({
      projectId: req.params.id,
      title,
      description,
      dueDate,
      orderIndex: orderIndex ?? 0,
    }).returning();
    res.status(201).json({ data: milestone });
  } catch (err) { next(err); }
});

// PATCH /projects/:id/milestones/:milestoneId
router.patch('/:id/milestones/:milestoneId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, completedAt } = req.body;
    const [updated] = await db
      .update(milestones)
      .set({
        status,
        completedAt: status === 'DONE' ? (completedAt ? new Date(completedAt) : new Date()) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, req.params.milestoneId))
      .returning();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// POST /projects/:id/time-entries
router.post('/:id/time-entries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, hours, loggedAt, billable } = req.body;
    const [entry] = await db.insert(timeEntries).values({
      projectId: req.params.id,
      description,
      hours: String(hours),
      loggedAt: loggedAt ?? undefined,
      billable: billable ?? true,
    }).returning();
    res.status(201).json({ data: entry });
  } catch (err) { next(err); }
});

export default router;
