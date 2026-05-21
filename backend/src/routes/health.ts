import { Router } from 'express';
import { prisma } from '../db';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    name: 'RoadSense API',
    status: 'online',
    version: '1.0.0'
  });
});

healthRouter.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

healthRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', service: 'roadsense-api', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'error' });
  }
});
