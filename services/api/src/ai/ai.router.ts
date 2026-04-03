import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { writeProposal } from './agents/proposal-writer.agent';
import { qualifyLead } from './agents/lead-qualifier.agent';
import { writeContent } from './agents/content-writer.agent';
import { db } from '../db/client';
import { aiAgentRuns } from '../db/schema';
import { desc, sql } from 'drizzle-orm';

const router = Router();

// POST /ai/proposal
router.post('/proposal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = z.object({
      contactId: z.string().uuid(),
      serviceType: z.enum(['AI_AGENT', 'AUTOMATION', 'WHATSAPP_SERVICE', 'CONSULTING']),
      painPoints: z.string().min(20),
      additionalContext: z.string().optional(),
    }).parse(req.body);

    const result = await writeProposal(input);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// POST /ai/qualify-lead
router.post('/qualify-lead', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId } = z.object({ contactId: z.string().uuid() }).parse(req.body);
    const qualification = await qualifyLead(contactId);
    res.json({ data: qualification });
  } catch (err) { next(err); }
});

// POST /ai/content
router.post('/content', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = z.object({
      topic: z.string().min(5),
      platform: z.enum(['LINKEDIN', 'INSTAGRAM', 'TWITTER']),
      tone: z.enum(['educativo', 'provocativo', 'storytelling', 'lista']).optional(),
    }).parse(req.body);

    const result = await writeContent(input);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /ai/usage — custo acumulado do mês
router.get('/usage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.execute(sql`
      SELECT
        agent_type,
        COUNT(*) as runs,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        ROUND(SUM(cost_usd::numeric), 4) as cost_usd,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failures
      FROM ai_agent_runs
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      GROUP BY agent_type
      ORDER BY cost_usd DESC
    `);

    const totalCost = result.rows.reduce(
      (acc, row) => acc + Number((row as { cost_usd: string }).cost_usd ?? 0),
      0,
    );

    res.json({
      data: {
        breakdown: result.rows,
        totalCostUsd: totalCost.toFixed(4),
        budgetUsd: process.env.AI_MAX_MONTHLY_BUDGET_USD ?? 100,
        budgetUsedPct: ((totalCost / Number(process.env.AI_MAX_MONTHLY_BUDGET_USD ?? 100)) * 100).toFixed(1),
      },
    });
  } catch (err) { next(err); }
});

export default router;
