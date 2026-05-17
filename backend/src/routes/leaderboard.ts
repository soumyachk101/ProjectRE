import { Router } from 'express';
import { prisma } from '../db';

export const leaderboardRouter = Router();

// GET /api/v1/leaderboard?limit=20
leaderboardRouter.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) ?? 20, 100);

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          trips: true,
        },
      },
      trips: {
        select: {
          _count: { select: { roadEvents: true } },
        },
      },
    },
    take: 100,
  });

  const ranked = users
    .map((u) => ({
      name: u.name ?? 'Anonymous',
      events_detected: u.trips.reduce((sum, t) => sum + t._count.roadEvents, 0),
      trips_completed: u._count.trips,
    }))
    .sort((a, b) => b.events_detected - a.events_detected)
    .slice(0, limit)
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  res.json(ranked);
});
