import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ZodError } from 'zod';
import { env } from './config/env';

import crmRouter from './modules/crm/crm.router';
import projectsRouter from './modules/projects/projects.router';
import financesRouter from './modules/finances/finances.router';
import webhooksRouter from './modules/webhooks/webhooks.router';
import aiRouter from './ai/ai.router';

const app = express();

// ── Middlewares ────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: [
    `https://app.${process.env.DOMAIN ?? 'localhost'}`,
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));

// ── Healthcheck ────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Rotas ──────────────────────────────────────────────────

app.use('/crm', crmRouter);
app.use('/projects', projectsRouter);
app.use('/finances', financesRouter);
app.use('/webhooks', webhooksRouter);
app.use('/ai', aiRouter);

// ── Error Handler ──────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof Error) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const isProduction = env.NODE_ENV === 'production';

    console.error(`[API Error] ${err.message}`, err.stack);

    return res.status(statusCode).json({
      error: isProduction && statusCode === 500 ? 'Erro interno do servidor' : err.message,
    });
  }

  res.status(500).json({ error: 'Erro desconhecido' });
});

// ── Start ──────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`✅ API rodando na porta ${env.PORT} (${env.NODE_ENV})`);
});

export default app;
