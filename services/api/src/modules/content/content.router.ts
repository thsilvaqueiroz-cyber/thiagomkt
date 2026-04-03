import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../../db/client';
import { contentPosts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /content/posts?status=DRAFT&platform=LINKEDIN
router.get('/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, platform } = req.query as { status?: string; platform?: string };

    let query = db.select().from(contentPosts).orderBy(desc(contentPosts.createdAt)).$dynamic();

    if (status) {
      query = query.where(eq(contentPosts.status, status as 'IDEA'));
    }

    const posts = await query.limit(50);
    res.json({ data: posts });
  } catch (err) { next(err); }
});

// GET /content/posts/:id
router.get('/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [post] = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.id, req.params.id))
      .limit(1);
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    res.json({ data: post });
  } catch (err) { next(err); }
});

// PATCH /content/posts/:id — atualizar status, agendar, etc.
router.patch('/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      status: z.enum(['IDEA', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
      content: z.string().optional(),
      scheduledFor: z.string().datetime().optional(),
      publishedAt: z.string().datetime().optional(),
    });

    const input = schema.parse(req.body);

    const [updated] = await db
      .update(contentPosts)
      .set({
        ...input,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(contentPosts.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Post não encontrado' });
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /content/posts/:id
router.delete('/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db
      .update(contentPosts)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(contentPosts.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /content/next-scheduled — para o n8n buscar o próximo post agendado
router.get('/next-scheduled', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const posts = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.status, 'SCHEDULED'))
      .orderBy(contentPosts.scheduledFor)
      .limit(1);

    const nextPost = posts.find(p => p.scheduledFor && new Date(p.scheduledFor) <= now);
    res.json({ data: nextPost ?? null });
  } catch (err) { next(err); }
});

export default router;
