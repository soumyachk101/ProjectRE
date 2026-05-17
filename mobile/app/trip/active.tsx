import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { SensorEngine, VehicleType, Placement } from '../../services/SensorEngine';
import { useTripStore } from '../../store/trip';
import { useEventsStore } from '../../store/events';
import { PocCandidate } from '../../types';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { StatCard } from '../../components/ui/StatCard';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function ActiveTripScreen() {
  const mapRef = useRef<MapView>(null);
  const engineRef = useRef<SensorEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [starting, setStarting] = useState(false);

  const activeTrip = useTripStore((s) => s.activeTrip);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const distanceKm = useTripStore((s) => s.distanceKm);
  const eventCount = useTripStore((s) => s.eventCount);
  const elapsedSeconds = useTripStore((s) => s.elapsedSeconds);
  const lastEventLabel = useTripStore((s) => s.lastEventLabel);
  const incrementEvents = useTripStore((s) => s.incrementEvents);
  const setLastEvent = useTripStore((s) => s.setLastEvent);
  const incrementElapsed = useTripStore((s) => s.incrementElapsed);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const triggerAlert = useEventsStore((s) => s.triggerAlert);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startTrip = useCallback(async () => {
    setStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access required to record trips.');
        return;
      }

      const vehicleType = ((await SecureStore.getItemAsync('vehicle_type')) ?? 'two_wheeler') as VehicleType;
      const placement = ((await SecureStore.getItemAsync('phone_placement')) ?? 'mounter') as Placement;

      const { data: trip } = await api.trips.create(vehicleType, placement);
      setActiveTrip(trip);

      timerRef.current = setInterval(incrementElapsed, 1000);

      const loc = await Location.getCurrentPositionAsync({});
      const start = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setRoute([start]);
      mapRef.current?.animateToRegion({ ...start, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);

      engineRef.current = new SensorEngine({
        tripId: trip.id,
        vehicleType,
        placement,
        onPocDetected: (poc: PocCandidate) => {
          incrementEvents();
          setLastEvent(poc.z_value > 0 ? '⚡ Speed Breaker' : '🕳 Pothole');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          triggerAlert(poc.z_value > 0 ? 'speed_breaker' : 'pothole', 0);
        },
        onFlush: async (pocs) => {
          await api.trips.uploadPoc(trip.id, pocs);
        },
      });
      await engineRef.current.start();

      // Track route
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 10 },
        (loc) => {
          setRoute((prev) => [
            ...prev,
            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          ]);
        }
      );
    } finally {
      setStarting(false);
    }
  }, []);

  const endTrip = useCallback(async () => {
    if (!activeTrip) return;
    engineRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await api.trips.end(activeTrip.id);
    } catch {}
    resetTrip();
    router.replace('/(tabs)/history');
  }, [activeTrip]);

  useEffect(() => {
    if (!activeTrip) startTrip();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>SENSING ACTIVE</Text>
        <Text style={styles.distanceText}>{distanceKm.toFixed(1)} km covered</Text>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={darkMapStyle}
        showsUserLocation
        followsUserLocation
      >
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.primary}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Stats panel */}
      <View style={styles.statsPanel}>
        <StatCard label="Speed" value="— km/h" />
        <StatCard label="Events" value={eventCount} />
        <StatCard label="Time" value={formatTime(elapsedSeconds)} />
      </View>

      {lastEventLabel && (
        <View style={styles.lastEvent}>
          <Text style={styles.lastEventText}>Last: {lastEventLabel}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.endBtn} onPress={endTrip}>
        <Text style={styles.endBtnText}>⏹ END TRIP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statusBar: {
    backgroundColor: colors.success + '22',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.success,
    zIndex: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  statusText: { ...typography.label, color: colors.success, textTransform: 'uppercase' },
  distanceText: { ...typography.caption, color: colors.textSecondary, marginLeft: 'auto' },
  map: { flex: 1 },
  statsPanel: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  lastEvent: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.elevated,
  },
  lastEventText: { ...typography.body, color: colors.textSecondary },
  endBtn: {
    backgroundColor: colors.danger,
    margin: spacing.md, marginTop: 0,
    borderRadius: radius.card, padding: spacing.md, alignItems: 'center',
  },
  endBtnText: { ...typography.h3, color: colors.textPrimary },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d0221' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0221' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1035' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#241548' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06b6d422' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
