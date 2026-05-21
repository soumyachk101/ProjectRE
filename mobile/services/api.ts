import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens, PocCandidate, Trip, User, QualityScore, UserStats, LeaderboardEntry, ManualReport } from '../types';
import { useAuthStore } from '../store/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(client(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('No refresh token');

        const { data } = await axios.post<AuthTokens>(`${BASE_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);

        refreshQueue.forEach((cb) => cb(data.access_token));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return client(originalRequest);
      } catch {
        refreshQueue = [];
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        useAuthStore.getState().logout();
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
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
      client.get('/events', { params: { bbox: `${lat1},${lng1},${lat2},${lng2}` } }),
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
