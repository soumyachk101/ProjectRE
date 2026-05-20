import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { prisma } from './db';
import { redis } from './redis';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { tripsRouter } from './routes/trips';
import { eventsRouter } from './routes/events';
import { usersRouter } from './routes/users';
import { leaderboardRouter } from './routes/leaderboard';
import { startWorkers } from './services/queue';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);

// 404
app.use((_req, res) => { res.status(404).json({ detail: 'Not found' }); });

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) return _next(err);
  console.error(err);
  res.status(500).json({ detail: 'Internal server error' });
});

async function start() {
  await redis.connect();
  try {
    startWorkers();
  } catch (err) {
    console.error('Worker start failed:', err);
  }

  app.listen(config.port, () => {
    console.log(`RoadSense API listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});

async function cleanup() {
  try {
    await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
