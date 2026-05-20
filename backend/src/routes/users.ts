import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const usersRouter = Router();

// GET /api/v1/users/me/stats
usersRouter.get('/me/stats', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const [totalTrips, tripEvents, userConfirmedEvents, trips] = await Promise.all([
    prisma.trip.count({ where: { userId } }),
    prisma.roadEvent.count({ where: { trip: { userId } } }),
    prisma.confirmedEvent.count({ where: { isActive: true } }),
    prisma.trip.findMany({
      where: { userId, status: 'completed' },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  const totalEvents = tripEvents;

  const totalDistanceKm = trips.reduce((sum, t) => {
    if (!t.startedAt || !t.endedAt) return sum;
    const durationMin = (new Date(t.endedAt).getTime() - new Date(t.startedAt).getTime()) / 60000;
    return sum + durationMin * 0.5; // rough estimate
  }, 0);

  // Rank: count users with more road events
  const betterUsers = await prisma.$queryRaw<{count: bigint}[]>`
    SELECT COUNT(*) as count FROM users u WHERE (
      SELECT COUNT(*) FROM road_events re
      JOIN trips t ON re.trip_id = t.id
      WHERE t.user_id = u.id
    ) > ${totalEvents}
  `;
  const rank = Number(betterUsers[0]?.count ?? 0) + 1;

  res.json({
    total_trips: totalTrips,
    total_events: totalEvents,
    total_distance_km: Math.round(totalDistanceKm * 10) / 10,
    rank,
    streak_days: 0,
  });
});
