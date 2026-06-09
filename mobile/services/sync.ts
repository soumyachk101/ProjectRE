import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { PocCandidate } from '../types';

const UNSYNCED_TRIPS_KEY = 'roadsense_unsynced_trips';

export interface UnsyncedTrip {
  tripId: string;
  pocs: PocCandidate[];
  endNeedsSync: boolean;
  pocsNeedSync: boolean;
}

export const syncManager = {
  async saveUnsyncedTrip(trip: UnsyncedTrip): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(UNSYNCED_TRIPS_KEY);
      const trips: UnsyncedTrip[] = stored ? JSON.parse(stored) : [];
      
      const index = trips.findIndex(t => t.tripId === trip.tripId);
      if (index > -1) {
        trips[index] = {
          ...trips[index],
          endNeedsSync: trips[index].endNeedsSync || trip.endNeedsSync,
          pocsNeedSync: trips[index].pocsNeedSync || trip.pocsNeedSync,
          pocs: [...trips[index].pocs, ...trip.pocs].filter(
            (poc, idx, self) => self.findIndex(p => p.recorded_at === poc.recorded_at) === idx
          )
        };
      } else {
        trips.push(trip);
      }
      
      await AsyncStorage.setItem(UNSYNCED_TRIPS_KEY, JSON.stringify(trips));
    } catch (e) {
      console.error('[syncManager] Failed to save unsynced trip:', e);
    }
  },

  async getUnsyncedTrips(): Promise<UnsyncedTrip[]> {
    try {
      const stored = await AsyncStorage.getItem(UNSYNCED_TRIPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[syncManager] Failed to get unsynced trips:', e);
      return [];
    }
  },

  async syncOfflineData(): Promise<void> {
    try {
      const trips = await this.getUnsyncedTrips();
      if (trips.length === 0) return;

      const updatedTrips: UnsyncedTrip[] = [];

      for (const trip of trips) {
        let { endNeedsSync, pocsNeedSync, tripId, pocs } = trip;

        if (endNeedsSync) {
          try {
            await api.trips.end(tripId);
            endNeedsSync = false;
          } catch (e) {
            console.warn(`[syncManager] Failed to sync end for trip ${tripId}:`, e);
          }
        }

        if (pocsNeedSync && pocs.length > 0) {
          try {
            await api.trips.uploadPoc(tripId, pocs);
            pocsNeedSync = false;
          } catch (e) {
            console.warn(`[syncManager] Failed to sync POCs for trip ${tripId}:`, e);
          }
        }

        if (endNeedsSync || pocsNeedSync) {
          updatedTrips.push({ tripId, pocs, endNeedsSync, pocsNeedSync });
        }
      }

      await AsyncStorage.setItem(UNSYNCED_TRIPS_KEY, JSON.stringify(updatedTrips));
      console.log(`[syncManager] Sync complete. Remaining unsynced trips: ${updatedTrips.length}`);
    } catch (e) {
      console.error('[syncManager] Error during syncOfflineData:', e);
    }
  }
};
