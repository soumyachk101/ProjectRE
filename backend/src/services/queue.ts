import { Queue, Worker } from 'bullmq';
import { redis } from '../redis';
import { prisma } from '../db';
import { config } from '../config';

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: parseInt(u.port || '6379', 10) };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

const connection = parseRedisUrl(config.redisUrl);
const ML_URL = config.mlServiceUrl;

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
    console.error(`Job ${job?.id} failed:`, err instanceof Error ? err.message : err);
  });

  return worker;
}

async function classifyWithML(pocs: any[]) {
  try {
    const res = await fetch(`${ML_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates: pocs.map((poc) => ({
          z_value: poc.zValue,
          z_next: poc.zNext,
          z_prev: poc.zPrev,
          tp: poc.tp ?? 0,
          speed_kmh: poc.speedKmh ?? 0,
          lat: poc.lat,
          lng: poc.lng,
        })),
      }),
    });

    if (!res.ok) throw new Error(`ML service returned ${res.status}`);
    const data = await res.json() as { results: any[] };
    return data.results;
  } catch (err) {
    console.warn('ML service unavailable, falling back to rule-based:', (err as Error).message);
    return null;
  }
}

async function classifyTrip(tripId: string) {
  const pocs = await prisma.pocCandidate.findMany({ where: { tripId } });
  if (!pocs.length) {
    await prisma.trip.update({ where: { id: tripId }, data: { status: 'completed' } });
    return;
  }

  // Try ML classification first, fall back to rule-based
  const mlResults = await classifyWithML(pocs);

  const validEventTypes = ['pothole', 'speed_breaker', 'road_crack', 'water_logging', 'accident', 'construction'];

  await prisma.$transaction([
    ...pocs.map((poc, i) => {
      let eventType: string;
      let confidence: number;

      if (mlResults && mlResults[i]) {
        eventType = validEventTypes.includes(mlResults[i].event_type) ? mlResults[i].event_type : 'pothole';
        confidence = typeof mlResults[i].confidence === 'number' ? Math.min(1, Math.max(0, mlResults[i].confidence)) : 0.5;
      } else {
        // Rule-based fallback
        eventType = poc.zValue > 0 ? 'speed_breaker' : 'pothole';
        confidence = 0.6;
      }

      const severity = Math.abs(poc.zValue) > 2.0 ? 'HIGH' : 'MEDIUM';

      return prisma.roadEvent.create({
        data: {
          tripId,
          pocCandidateId: poc.id,
          eventType,
          lat: poc.lat,
          lng: poc.lng,
          severity,
          confidenceScore: confidence,
        },
      });
    }),
    prisma.trip.update({ where: { id: tripId }, data: { status: 'completed' } }),
  ]);
}
