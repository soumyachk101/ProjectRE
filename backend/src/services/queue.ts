import { Queue, Worker } from 'bullmq';
import { redis } from '../redis';
import { prisma } from '../db';

const connection = { host: 'localhost', port: 6379 };

export const tripQueue = new Queue('trip-processing', { connection });

export function startWorkers() {
  const worker = new Worker(
    'trip-processing',
    async (job) => {
      if (job.name === 'process-trip') {
        const { tripId } = job.data as { tripId: string };
        await classifyTrip(tripId);
      }
    },
    { connection, concurrency: 4 }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

async function classifyTrip(tripId: string) {
  const pocs = await prisma.pocCandidate.findMany({ where: { tripId } });
  if (!pocs.length) return;

  // Classify each PoC: z_value > 0 = speed_breaker, z_value < 0 = pothole
  // Full ML classification runs in Python ml/ service; this is the rule-based fallback
  await prisma.$transaction(
    pocs.map((poc) => {
      const eventType = poc.zValue > 0 ? 'speed_breaker' : 'pothole';
      const severity = Math.abs(poc.zValue) > 2.0 ? 'HIGH' : 'MEDIUM';
      return prisma.roadEvent.create({
        data: {
          tripId,
          pocCandidateId: poc.id,
          eventType,
          lat: poc.lat,
          lng: poc.lng,
          severity,
          confidenceScore: 0.7,
        },
      });
    })
  );

  await prisma.trip.update({ where: { id: tripId }, data: { status: 'completed' } });
}
