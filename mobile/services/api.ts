import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AuthTokens, PocCandidate, Trip, User, QualityScore, UserStats, LeaderboardEntry, ManualReport } from '../types';
import { useAuthStore } from '../store/auth';

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // If we have a custom URL defined in .env and it's not a localhost/loopback address, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // Fallback / auto-detection for development environments
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.100:8081"
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      const port = envUrl ? (envUrl.match(/:(\d+)/)?.[1] ?? '8080') : '8080';
      return `http://${ip}:${port}/api/v1`;
    }
    // Fallback if hostUri is not available
    const port = envUrl ? (envUrl.match(/:(\d+)/)?.[1] ?? '8080') : '8080';
    return Platform.OS === 'android' 
      ? `http://10.0.2.2:${port}/api/v1` 
      : `http://localhost:${port}/api/v1`;
  }

  return envUrl ?? 'https://projectre-production.up.railway.app/api/v1';
};

const BASE_URL = getBaseUrl();

const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
type QueueResolver = (token: string | Error) => void;
let refreshQueue: Array<QueueResolver> = [];

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Fast path: 401 with no refresh token means the session is gone.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token instanceof Error) {
            reject(token);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(client(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (!refresh) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      const { data } = await axios.post<AuthTokens>(`${BASE_URL}/auth/refresh`, {
        refresh_token: refresh,
      });
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);

      refreshQueue.forEach((cb) => cb(data.access_token));
      refreshQueue = [];

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return client(originalRequest);
    } catch (refreshError) {
      // Drain queued requests so they reject immediately (previously the
      // queue was dropped silently and any caller waiting on it hung for
      // the full 30s axios timeout).
      const queued = refreshQueue;
      refreshQueue = [];
      queued.forEach((cb) => cb(refreshError instanceof Error ? refreshError : new Error('Refresh failed')));

      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const api = {
  auth: {
    register: (phone: string, name: string, vehicle_type?: string) =>
      client.post<User>('/auth/register', { phone, name, vehicle_type }),
    sendOtp: (phone: string) =>
      client.post('/auth/send-otp', { phone }),
    login: (phone: string, otp: string) =>
      client.post<AuthTokens>('/auth/login', { phone, otp }),
    refresh: (refresh_token: string) =>
      client.post<AuthTokens>('/auth/refresh', { refresh_token }),
  },

  trips: {
    create: (vehicle_type: string, phone_placement: string) =>
      client.post<Trip>('/trips', { vehicle_type, phone_placement }),
    end: (tripId: string) =>
      client.post<Trip>(`/trips/${tripId}/end`),
    list: () =>
      client.get<Trip[]>('/trips'),
    get: (tripId: string) =>
      client.get<Trip>(`/trips/${tripId}`),
    uploadPoc: (tripId: string, pocs: PocCandidate[]) =>
      client.post(`/trips/${tripId}/poc`, { candidates: pocs }),
  },

  events: {
    nearby: (lat: number, lng: number, radiusM: number = 5000) =>
      client.get('/events', { params: { lat, lng, radius_m: radiusM } }),
    bbox: (lat1: number, lng1: number, lat2: number, lng2: number) =>
      client.get('/events/bbox', { params: { bbox: `${lat1},${lng1},${lat2},${lng2}` } }),
    report: (report: ManualReport) =>
      client.post('/events/report', report),
    quality: (lat: number, lng: number, radiusM: number = 500) =>
      client.get<QualityScore>('/events/quality', { params: { lat, lng, radius_m: radiusM } }),
  },

  users: {
    stats: () => client.get<UserStats>('/users/me/stats'),
  },

  leaderboard: {
    list: (limit: number = 20) =>
      client.get<LeaderboardEntry[]>('/leaderboard', { params: { limit } }),
  },
};
