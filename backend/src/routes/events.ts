import { Router } from 'express';
import { prisma } from '../db';

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
