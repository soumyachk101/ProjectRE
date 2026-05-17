import { create } from 'zustand';
import { Trip, VehicleType, PhonePlacement } from '../types';

interface TripState {
  activeTrip: Trip | null;
  distanceKm: number;
  eventCount: number;
  elapsedSeconds: number;
  lastEventLabel: string | null;
  setActiveTrip: (trip: Trip | null) => void;
  incrementDistance: (km: number) => void;
  incrementEvents: () => void;
  setLastEvent: (label: string) => void;
  incrementElapsed: () => void;
  resetTrip: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  activeTrip: null,
  distanceKm: 0,
  eventCount: 0,
  elapsedSeconds: 0,
  lastEventLabel: null,

  setActiveTrip: (trip) => set({ activeTrip: trip }),
  incrementDistance: (km) => set((s) => ({ distanceKm: s.distanceKm + km })),
  incrementEvents: () => set((s) => ({ eventCount: s.eventCount + 1 })),
  setLastEvent: (label) => set({ lastEventLabel: label }),
  incrementElapsed: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  resetTrip: () =>
    set({ activeTrip: null, distanceKm: 0, eventCount: 0, elapsedSeconds: 0, lastEventLabel: null }),
}));
