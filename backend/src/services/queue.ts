import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { redis } from '../redis';
import { prisma } from '../db';
import { config } from '../config';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
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
  const pocs = await prisma.pocCandidate.findMany({
    where: { tripId },
    orderBy: { recordedAt: 'asc' },
  });
  if (!pocs.length) {
    await prisma.trip.update({ where: { id: tripId }, data: { status: 'completed' } });
    return;
  }

  // Try ML classification first, fall back to rule-based
  const mlResults = await classifyWithML(pocs);

  const validEventTypes = ['pothole', 'speed_breaker', 'broken_patch', 'road_crack', 'water_logging', 'accident', 'construction'];

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
    prisma.trip.update({
      where: { id: tripId },
      data: { status: 'completed', distanceKm: computeDistanceKm(pocs) },
    }),
  ]);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeDistanceKm(pocs: { lat: number; lng: number }[]): number {
  if (pocs.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < pocs.length; i++) {
    km += haversineKm(pocs[i - 1].lat, pocs[i - 1].lng, pocs[i].lat, pocs[i].lng);
  }
  return Math.round(km * 100) / 100;
}
