import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { PocCandidate } from '../types';

// Sample rate per AI_INSTRUCTIONS §7
const SAMPLE_RATE_HZ = 50;
const SAMPLE_INTERVAL_MS = Math.floor(1000 / SAMPLE_RATE_HZ);
const FLUSH_EVERY_N = 500;

// Per AI_INSTRUCTIONS §4.2 — Table 2 of the paper
const INITIAL_THRESHOLDS = {
  speed_breaker: {
    two_wheeler:   { mounter: 1.8,  pocket: 1.57 },
    three_wheeler: { mounter: 1.47, pocket: null },
    four_wheeler:  { mounter: 1.08, pocket: null },
  },
  pothole: {
    two_wheeler:   { mounter: 0.714, pocket: 0.612 },
    three_wheeler: { mounter: 0.612, pocket: null },
    four_wheeler:  { mounter: 0.41,  pocket: null },
  },
};

// Tuning constants from paper
const THRESHOLD_CONFIG = { B: 20.0, L: 20.0, S: 0.3 };

// Auto-orient: Euler angles — AI_INSTRUCTIONS §4.1
function autoOrient(ax: number, ay: number, az: number): [number, number, number] {
  const theta = Math.atan2(ay, az);
  const beta = Math.atan2(-ax, Math.sqrt(ay ** 2 + az ** 2));

  const ax_v =
    ax * Math.cos(beta) +
    ay * Math.sin(beta) * Math.sin(theta) +
    az * Math.cos(theta) * Math.sin(beta);
  const ay_v = ay * Math.cos(theta) - az * Math.sin(theta);
  const az_v =
    -ax * Math.sin(beta) +
    ay * Math.cos(beta) * Math.sin(theta) +
    az * Math.cos(beta) * Math.cos(theta);

  return [ax_v, ay_v, az_v];
}

// Dynamic threshold — AI_INSTRUCTIONS §4.2
function computeThreshold(T0: number, speedHistory: number[], eventType: 'speed_breaker' | 'pothole'): number {
  if (!speedHistory.length) return T0;
  const avgSpeed = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
  if (avgSpeed > THRESHOLD_CONFIG.B) {
    const S = eventType === 'speed_breaker' ? THRESHOLD_CONFIG.S : -THRESHOLD_CONFIG.S;
    const Tt = T0 + (avgSpeed - THRESHOLD_CONFIG.L) * S;
    // Clamp to prevent negative/unphysically low thresholds for potholes
    // and keep speed-breaker thresholds within a reasonable detection range
    if (eventType === 'pothole') {
      return Math.max(0.15, Tt);
    } else {
      return Math.min(4.0, Math.max(0.5, Tt));
    }
  }
  return T0;
}

export type VehicleType = 'two_wheeler' | 'three_wheeler' | 'four_wheeler';
export type Placement = 'mounter' | 'pocket' | 'dashboard';

interface SensorEngineOptions {
  tripId: string;
  vehicleType: VehicleType;
  placement: Placement;
  onPocDetected: (poc: PocCandidate) => void;
  onFlush: (pocs: PocCandidate[]) => Promise<void>;
  onSensorData?: (data: { x: number; y: number; z: number }) => void;
}

export class SensorEngine {
  private tripId: string;
  private vehicleType: VehicleType;
  private placement: Placement;
  private onPocDetected: (poc: PocCandidate) => void;
  private onFlush: (pocs: PocCandidate[]) => Promise<void>;
  private onSensorData?: (data: { x: number; y: number; z: number }) => void;

  private pocBuffer: PocCandidate[] = [];
  private zHistory: number[] = [];
  private speedHistory: number[] = [];
  private currentSpeed: number = 0;
  private currentLat: number = 0;
  private currentLng: number = 0;

  private lpfValue: number = 0;
  private readonly LPF_ALPHA = 0.8;

  private accelSub: ReturnType<typeof Accelerometer.addListener> | null = null;
  private locationSub: Location.LocationSubscription | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  private sampleCount = 0;
  private prevZ: number | null = null;

  private sensorListeners: ((data: { x: number; y: number; z: number }) => void)[] = [];
  private lastRecordedPocIndex: number | null = null;

  addSensorListener(listener: (data: { x: number; y: number; z: number }) => void): () => void {
    this.sensorListeners.push(listener);
    return () => {
      this.sensorListeners = this.sensorListeners.filter((l) => l !== listener);
    };
  }

  constructor(opts: SensorEngineOptions) {
    this.tripId = opts.tripId;
    this.vehicleType = opts.vehicleType;
    this.placement = opts.placement;
    this.onPocDetected = opts.onPocDetected;
    this.onFlush = opts.onFlush;
    this.onSensorData = opts.onSensorData;
  }

  async start(): Promise<void> {
    try {
      const isAccelAvailable = await Accelerometer.isAvailableAsync();
      if (isAccelAvailable) {
        Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
        this.accelSub = Accelerometer.addListener(({ x, y, z }) => {
          this.processSample(x, y, z);
        });
      } else {
        console.warn('[SensorEngine] Accelerometer is not available on this device/simulator.');
      }
    } catch (e) {
      console.warn('[SensorEngine] Failed to check or initialize accelerometer:', e);
    }

    try {
      this.locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
        (loc) => {
          this.currentLat = loc.coords.latitude;
          this.currentLng = loc.coords.longitude;
          const speedMs = loc.coords.speed ?? 0;
          this.currentSpeed = Math.max(0, speedMs * 3.6); // m/s → km/h
          this.speedHistory.push(this.currentSpeed);
          if (this.speedHistory.length > 30) this.speedHistory.shift();
        }
      );
    } catch (e) {
      console.warn('[SensorEngine] watchPositionAsync failed in SensorEngine:', e);
    }

    this.flushInterval = setInterval(() => this.flush(), 3000);
  }

  stop(): void {
    this.accelSub?.remove();
    this.locationSub?.remove();
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flush();
  }

  private processSample(ax: number, ay: number, az: number): void {
    // Don't detect when stationary — per AI_INSTRUCTIONS §10
    if (this.currentSpeed < 5) return;

    const [ax_v, ay_v, az_v] = autoOrient(ax, ay, az);

    // Call callback throttled to avoid blocking UI thread (every 10 samples, ~66ms)
    if (this.sampleCount % 10 === 0) {
      const sensorData = { x: ax_v, y: ay_v, z: az_v };
      if (this.onSensorData) {
        this.onSensorData(sensorData);
      }
      this.sensorListeners.forEach((l) => l(sensorData));
    }

    // Low-pass filter — extract vertical component
    this.lpfValue = this.LPF_ALPHA * this.lpfValue + (1 - this.LPF_ALPHA) * az_v;
    const z_filtered = az_v - this.lpfValue;

    const placementKey = this.placement === 'dashboard' ? 'mounter' : this.placement;

    const sbT0 =
      INITIAL_THRESHOLDS.speed_breaker[this.vehicleType][
        placementKey as 'mounter' | 'pocket'
      ] ?? INITIAL_THRESHOLDS.speed_breaker[this.vehicleType].mounter;

    const phT0 =
      INITIAL_THRESHOLDS.pothole[this.vehicleType][
        placementKey as 'mounter' | 'pocket'
      ] ?? INITIAL_THRESHOLDS.pothole[this.vehicleType].mounter;

    const sbThreshold = computeThreshold(sbT0, this.speedHistory, 'speed_breaker');
    const phThreshold = computeThreshold(phT0, this.speedHistory, 'pothole');

    // Upward acceleration (>0) -> Speed Breaker candidate
    // Downward acceleration (<0) -> Pothole candidate
    const isSb = z_filtered > 0 && z_filtered > sbThreshold;
    const isPh = z_filtered < 0 && z_filtered < -phThreshold;

    // If the previous sample triggered a PoC, we can set its z_next to the current sample's z_filtered
    if (this.lastRecordedPocIndex !== null && this.pocBuffer.length > this.lastRecordedPocIndex) {
      this.pocBuffer[this.lastRecordedPocIndex].z_next = z_filtered;
      this.lastRecordedPocIndex = null;
    }

    if (isSb || isPh) {
      const poc: PocCandidate = {
        trip_id: this.tripId,
        lat: this.currentLat,
        lng: this.currentLng,
        z_value: z_filtered,
        z_next: null,
        z_prev: this.prevZ,
        tp: Date.now() / 1000,
        speed_kmh: this.currentSpeed,
        threshold_used: isSb ? sbThreshold : phThreshold,
        recorded_at: new Date().toISOString(),
      };
      this.pocBuffer.push(poc);
      this.lastRecordedPocIndex = this.pocBuffer.length - 1;
      this.onPocDetected(poc);
    }

    this.prevZ = z_filtered;
    this.sampleCount++;

    if (this.sampleCount >= FLUSH_EVERY_N) {
      this.sampleCount = 0;
      this.flush();
    }
  }

  private flush(): void {
    if (!this.pocBuffer.length) return;
    const batch = [...this.pocBuffer];
    this.pocBuffer = [];
    this.onFlush(batch).catch(console.error);
  }
}
