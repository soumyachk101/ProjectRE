export type VehicleType = 'two_wheeler' | 'three_wheeler' | 'four_wheeler';
export type PhonePlacement = 'mounter' | 'pocket' | 'dashboard';
export type EventType = 'speed_breaker' | 'pothole' | 'broken_patch' | 'anomaly';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TripStatus = 'pending' | 'active' | 'processing' | 'completed';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  vehicle_type: VehicleType | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PocCandidate {
  trip_id: string;
  lat: number;
  lng: number;
  z_value: number;
  z_next: number | null;
  z_prev: number | null;
  tp: number;
  speed_kmh: number;
  threshold_used: number;
  recorded_at: string;
}

export interface RoadEvent {
  id: string;
  trip_id: string;
  event_type: EventType;
  lat: number;
  lng: number;
  severity: Severity | null;
  confidence_score: number | null;
  is_confirmed: boolean;
  created_at: string;
}

export interface ConfirmedEvent {
  id: string;
  event_type: EventType;
  lat: number;
  lng: number;
  trail_count: number;
  confidence_score: number | null;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
}

export interface Trip {
  id: string;
  user_id: string;
  vehicle_type: VehicleType | null;
  phone_placement: PhonePlacement | null;
  status: TripStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  event_count?: number;
  distance_km?: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface QualityScore {
  score: number; // 0-100
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';
  event_count: number;
  radius_m: number;
}

export interface UserStats {
  total_trips: number;
  total_events: number;
  total_distance_km: number;
  rank: number;
  streak_days: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  events_detected: number;
  trips_completed: number;
}

export interface ManualReport {
  event_type: EventType;
  lat: number;
  lng: number;
  note?: string;
}
