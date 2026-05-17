import { create } from 'zustand';
import { ConfirmedEvent, EventType } from '../types';

interface AlertState {
  alert: { type: EventType; distanceM: number } | null;
}

interface EventsState {
  nearbyEvents: ConfirmedEvent[];
  filter: EventType | 'all';
  alert: AlertState['alert'];
  setNearbyEvents: (events: ConfirmedEvent[]) => void;
  setFilter: (f: EventType | 'all') => void;
  triggerAlert: (type: EventType, distanceM: number) => void;
  clearAlert: () => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  nearbyEvents: [],
  filter: 'all',
  alert: null,

  setNearbyEvents: (events) => set({ nearbyEvents: events }),
  setFilter: (filter) => set({ filter }),
  triggerAlert: (type, distanceM) => set({ alert: { type, distanceM } }),
  clearAlert: () => set({ alert: null }),
}));
