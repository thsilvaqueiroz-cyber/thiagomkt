import { Router, Request, Response, NextFunction } from 'express';
import * as service from './crm.service';

const router = Router();

// GET /crm/leads?stage=QUALIFIED
router.get('/leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stage = req.query.stage as string | undefined;
    const leads = await service.getLeads(stage);
    res.json({ data: leads });
  } catch (err) {
    next(err);
  }
});

// GET /crm/pipeline/summary
router.get('/pipeline/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await service.getPipelineSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// GET /crm/contacts/:id
router.get('/contacts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.getContact(req.params.id);
    res.json({ data: contact });
  } catch (err) {
    next(err);
  }
});

// POST /crm/leads
router.post('/leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = service.createContactSchema.parse(req.body);
    const result = await service.createLead(input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /crm/contacts/:id/stage
router.patch('/contacts/:id/stage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = service.updatePipelineStageSchema.parse(req.body);
    const { previousStage } = req.body;
    const pipeline = await service.updateStage(req.params.id, input, previousStage);
    res.json({ data: pipeline });
  } catch (err) {
    next(err);
  }
});

// POST /crm/contacts/:id/notes
router.post('/contacts/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content é obrigatório' });
    const activity = await service.addNote(req.params.id, content);
    res.status(201).json({ data: activity });
  } catch (err) {
    next(err);
  }
});

// GET /crm/contacts/:id/activities
router.get('/contacts/:id/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await service.getContactActivities(req.params.id);
    res.json({ data: activities });
  } catch (err) {
    next(err);
  }
});

export default router;
