import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const eventsRouter = Router();

// GET /api/v1/events?lat=23.5&lng=87.3&radius_m=5000
eventsRouter.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusM = parseFloat((req.query.radius_m as string) ?? '5000');

  if (isNaN(lat) || isNaN(lng)) {
    res.status(422).json({ detail: 'lat and lng required' });
    return;
  }

  // Haversine approximation in degrees — 1 deg ≈ 111.32 km
  const degDelta = radiusM / 111320;

  const events = await prisma.confirmedEvent.findMany({
    where: {
      isActive: true,
      lat: { gte: lat - degDelta, lte: lat + degDelta },
      lng: { gte: lng - degDelta, lte: lng + degDelta },
    },
    orderBy: { lastSeen: 'desc' },
    take: 200,
  });

  res.json(events.map(eventView));
});

// GET /api/v1/events/bbox?bbox=lat1,lng1,lat2,lng2
eventsRouter.get('/bbox', async (req, res) => {
  const bbox = (req.query.bbox as string)?.split(',').map(Number);
  if (!bbox || bbox.length !== 4 || bbox.some(isNaN)) {
    res.status(422).json({ detail: 'bbox must be lat1,lng1,lat2,lng2' });
    return;
  }
  const [lat1, lng1, lat2, lng2] = bbox;
  const events = await prisma.confirmedEvent.findMany({
    where: {
      isActive: true,
      lat: { gte: Math.min(lat1, lat2), lte: Math.max(lat1, lat2) },
      lng: { gte: Math.min(lng1, lng2), lte: Math.max(lng1, lng2) },
    },
    take: 500,
  });
  res.json(events.map(eventView));
});

// POST /api/v1/events/report — manual event report (requires auth)
eventsRouter.post('/report', requireAuth, async (req: AuthRequest, res) => {
  const { event_type, lat, lng } = req.body;
  if (!event_type || lat == null || lng == null) {
    res.status(422).json({ detail: 'event_type, lat, lng required' });
    return;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(422).json({ detail: 'Invalid lat/lng values' });
    return;
  }
  const validTypes = ['pothole', 'speed_breaker', 'road_crack', 'water_logging', 'accident', 'construction'];
  if (!validTypes.includes(event_type)) {
    res.status(422).json({ detail: `event_type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const event = await prisma.confirmedEvent.create({
    data: {
      eventType: event_type,
      lat,
      lng,
      trailCount: 1,
      confidenceScore: 0.8,
      firstSeen: new Date(),
      lastSeen: new Date(),
      isActive: true,
    },
  });

  res.status(201).json({ id: event.id, message: 'Report submitted' });
});

// GET /api/v1/events/quality?lat=X&lng=Y&radius_m=500
eventsRouter.get('/quality', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusM = parseFloat((req.query.radius_m as string) ?? '500');

  if (isNaN(lat) || isNaN(lng)) {
    res.status(422).json({ detail: 'lat and lng required' });
    return;
  }

  const degDelta = radiusM / 111320;

  const eventCount = await prisma.confirmedEvent.count({
    where: {
      isActive: true,
      lat: { gte: lat - degDelta, lte: lat + degDelta },
      lng: { gte: lng - degDelta, lte: lng + degDelta },
    },
  });

  const score = Math.max(0, Math.min(100, 100 - eventCount * 5));
  let label: string;
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Fair';
  else if (score >= 20) label = 'Poor';
  else label = 'Very Poor';

  res.json({ score, label, event_count: eventCount, radius_m: radiusM });
});

function eventView(e: any) {
  return {
    id: e.id,
    event_type: e.eventType,
    lat: e.lat,
    lng: e.lng,
    trail_count: e.trailCount,
    confidence_score: e.confidenceScore,
    first_seen: e.firstSeen,
    last_seen: e.lastSeen,
    is_active: e.isActive,
  };
}
