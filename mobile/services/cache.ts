import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfirmedEvent } from '../types';

const EVENTS_KEY = 'roadsense_cached_events';
const EVENTS_TS_KEY = 'roadsense_cached_events_ts';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cache = {
  async saveEvents(events: ConfirmedEvent[]): Promise<void> {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    await AsyncStorage.setItem(EVENTS_TS_KEY, Date.now().toString());
  },

  async getEvents(): Promise<ConfirmedEvent[] | null> {
    const ts = await AsyncStorage.getItem(EVENTS_TS_KEY);
    if (ts && Date.now() - parseInt(ts, 10) > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(EVENTS_KEY);
      await AsyncStorage.removeItem(EVENTS_TS_KEY);
      return null;
    }
    const data = await AsyncStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : null;
  },

  async clearEvents(): Promise<void> {
    await AsyncStorage.removeItem(EVENTS_KEY);
    await AsyncStorage.removeItem(EVENTS_TS_KEY);
  },
};
