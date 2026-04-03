import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../../db/client';
import { invoices, expenses } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

const createInvoiceSchema = z.object({
  contactId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('BRL'),
  dueDate: z.string().optional(),
  paymentLink: z.string().url().optional(),
  notes: z.string().optional(),
});

const createExpenseSchema = z.object({
  category: z.enum(['SOFTWARE', 'MARKETING', 'INFRASTRUCTURE', 'TAXES', 'EDUCATION', 'EQUIPMENT', 'OTHER']),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().length(3).default('BRL'),
  date: z.string(),
  recurring: z.boolean().default(false),
  notes: z.string().optional(),
});

// Gera número sequencial de fatura
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${year}`
  );
  const count = Number((result.rows[0] as { count: string }).count) + 1;
  return `INV-${year}-${String(count).padStart(3, '0')}`;
}

// GET /finances/invoices
router.get('/invoices', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    res.json({ data: result });
  } catch (err) { next(err); }
});

// POST /finances/invoices
router.post('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createInvoiceSchema.parse(req.body);
    const number = await generateInvoiceNumber();
    const [invoice] = await db.insert(invoices).values({
      ...input,
      number,
      amount: String(input.amount),
    }).returning();
    res.status(201).json({ data: invoice });
  } catch (err) { next(err); }
});

// PATCH /finances/invoices/:id/status
router.patch('/invoices/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, paidAt, paymentMethod } = req.body;
    const [updated] = await db
      .update(invoices)
      .set({
        status,
        paidAt: status === 'PAID' ? (paidAt ? new Date(paidAt) : new Date()) : undefined,
        paymentMethod: paymentMethod || undefined,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Fatura não encontrada' });
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// GET /finances/expenses
router.get('/expenses', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.select().from(expenses).orderBy(desc(expenses.date));
    res.json({ data: result });
  } catch (err) { next(err); }
});

// POST /finances/expenses
router.post('/expenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createExpenseSchema.parse(req.body);
    const [expense] = await db.insert(expenses).values({
      ...input,
      amount: String(input.amount),
    }).returning();
    res.status(201).json({ data: expense });
  } catch (err) { next(err); }
});

// GET /finances/summary
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [revenueResult, expensesResult, overdueResult] = await Promise.all([
      db.execute(sql`
        SELECT
          COALESCE(SUM(amount::numeric) FILTER (WHERE status = 'PAID'), 0) as received,
          COALESCE(SUM(amount::numeric) FILTER (WHERE status IN ('SENT', 'OVERDUE')), 0) as expected
        FROM invoices
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount::numeric), 0) as total
        FROM expenses
        WHERE DATE_TRUNC('month', date::date) = DATE_TRUNC('month', NOW())
      `),
      db.execute(sql`
        SELECT COUNT(*) as count, COALESCE(SUM(amount::numeric), 0) as total
        FROM invoices WHERE status = 'OVERDUE'
      `),
    ]);

    res.json({
      data: {
        currentMonth: {
          revenue: revenueResult.rows[0],
          expenses: expensesResult.rows[0],
        },
        overdue: overdueResult.rows[0],
      },
    });
  } catch (err) { next(err); }
});

export default router;
