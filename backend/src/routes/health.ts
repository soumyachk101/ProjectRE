import { Router } from 'express';
import { prisma } from '../db';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', service: 'roadsense-api', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'error' });
  }
});
