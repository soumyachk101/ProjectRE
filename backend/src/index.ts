import express from 'express';
import cors from 'cors';
import { config } from './config';
import { prisma } from './db';
import { redis } from './redis';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { tripsRouter } from './routes/trips';
import { eventsRouter } from './routes/events';
import { startWorkers } from './services/queue';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/events', eventsRouter);

// 404
app.use((_req, res) => { res.status(404).json({ detail: 'Not found' }); });

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ detail: 'Internal server error' });
});

async function start() {
  await redis.connect();
  startWorkers();

  app.listen(config.port, () => {
    console.log(`RoadSense API listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
