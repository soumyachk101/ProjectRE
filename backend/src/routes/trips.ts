import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { tripQueue } from '../services/queue';

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

const CreateTripSchema = z.object({
  vehicle_type: z.enum(['two_wheeler', 'three_wheeler', 'four_wheeler']),
  phone_placement: z.enum(['mounter', 'pocket', 'dashboard']),
});

const PocSchema = z.object({
  candidates: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    z_value: z.number(),
    z_next: z.number().nullable(),
    z_prev: z.number().nullable(),
    tp: z.number(),
    speed_kmh: z.number(),
    threshold_used: z.number(),
    recorded_at: z.string().datetime().optional(),
  })),
});

tripsRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = CreateTripSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ detail: parsed.error.flatten() }); return; }

  const trip = await prisma.trip.create({
    data: {
      userId: req.userId!,
      vehicleType: parsed.data.vehicle_type,
      phonePlacement: parsed.data.phone_placement,
      status: 'active',
      startedAt: new Date(),
    },
  });
  res.status(201).json(tripView(trip));
});

tripsRouter.get('/', async (req: AuthRequest, res) => {
  const trips = await prisma.trip.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(trips.map(tripView));
});

tripsRouter.get('/:id', async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!trip) { res.status(404).json({ detail: 'Trip not found' }); return; }
  res.json(tripView(trip));
});

tripsRouter.post('/:id/end', async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!trip) { res.status(404).json({ detail: 'Trip not found' }); return; }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: { status: 'processing', endedAt: new Date() },
  });

  // Enqueue ML pipeline
  await tripQueue.add('process-trip', { tripId: trip.id });

  res.json(tripView(updated));
});

tripsRouter.post('/:id/poc', async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!trip) { res.status(404).json({ detail: 'Trip not found' }); return; }

  const parsed = PocSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ detail: parsed.error.flatten() }); return; }

  await prisma.pocCandidate.createMany({
    data: parsed.data.candidates.map((c) => ({
      tripId: trip.id,
      lat: c.lat,
      lng: c.lng,
      zValue: c.z_value,
      zNext: c.z_next,
      zPrev: c.z_prev,
      tp: c.tp,
      speedKmh: c.speed_kmh,
      thresholdUsed: c.threshold_used,
      recordedAt: c.recorded_at ? new Date(c.recorded_at) : null,
    })),
  });

  res.json({ inserted: parsed.data.candidates.length });
});

function tripView(t: any) {
  return {
    id: t.id,
    user_id: t.userId,
    vehicle_type: t.vehicleType,
    phone_placement: t.phonePlacement,
    status: t.status,
    started_at: t.startedAt,
    ended_at: t.endedAt,
    created_at: t.createdAt,
  };
}
