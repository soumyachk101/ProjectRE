import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../services/api';
import { SensorEngine, VehicleType, Placement } from '../../services/SensorEngine';
import { useTripStore } from '../../store/trip';
import { useEventsStore } from '../../store/events';
import { PocCandidate } from '../../types';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { StatCard } from '../../components/ui/StatCard';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function ActiveTripScreen() {
  const mapRef = useRef<MapView>(null);
  const engineRef = useRef<SensorEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const pocBufferRef = useRef<PocCandidate[]>([]);

  const handlePocDetected = useCallback((poc: PocCandidate) => {
    incrementEvents();
    const eventType = poc.z_value < 0 ? 'pothole' : 'speed_breaker';
    setLastEvent(eventType);
    if (eventType === 'pothole') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const handleFlush = useCallback(async (pocs: PocCandidate[]) => {
    // buffer for later upload
    pocBufferRef.current.push(...pocs);
  }, []);

  const startTrip = async () => {
    setStarting(true);
    try {
      const vehicleType = (await SecureStore.getItemAsync('vehicleType')) as VehicleType ?? 'two_wheeler';
      const placement = (await SecureStore.getItemAsync('placement')) as Placement ?? 'mounter';
      const loc = await Location.getCurrentPositionAsync({});

      const { data: trip } = await api.trips.create(vehicleType, placement);
      setActiveTrip(trip);

      const engine = new SensorEngine({
        tripId: trip.id,
        vehicleType,
        placement,
        onPocDetected: handlePocDetected,
        onFlush: handleFlush,
      });
      engineRef.current = engine;
      await engine.start();

      setRoute([{ latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
      timerRef.current = setInterval(() => incrementElapsed(), 1000);

      locSubRef.current = await Location.watchPositionAsync(
        { distanceInterval: 20, accuracy: Location.Accuracy.Balanced },
        (loc) => {
          const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setRoute((r) => [...r, point]);
          mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        }
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to start trip');
    } finally {
      setStarting(false);
    }
  };

  const endTrip = async () => {
    if (!activeTrip) return;
    engineRef.current?.stop();
    locSubRef.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await api.trips.end(activeTrip.id);
    } catch {}

    resetTrip();
    router.replace('/(tabs)/home');
  };

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      locSubRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!activeTrip) {
    return (
      <View style={styles.startContainer}>
        <LinearGradient
          colors={gradients.dark as any}
          style={styles.startGradient}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={styles.startContent}>
            <LinearGradient
              colors={gradients.primaryBright as any}
              style={styles.startIconCircle}
            >
              <MaterialCommunityIcons name="navigation-variant" size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.startTitle}>Ready to ride?</Text>
            <Text style={styles.startSub}>
              RoadSense will detect road anomalies{'\n'}as you drive
            </Text>

            <View style={styles.startStats}>
              <View style={styles.startStatItem}>
                <MaterialCommunityIcons name="cellphone-arrow-down" size={20} color={colors.primaryLight} />
                <Text style={styles.startStatText}>Keep phone{'\n'}steady</Text>
              </View>
              <View style={styles.startStatDivider} />
              <View style={styles.startStatItem}>
                <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primaryLight} />
                <Text style={styles.startStatText}>Route auto{'\n'}tracked</Text>
              </View>
              <View style={styles.startStatDivider} />
              <View style={styles.startStatItem}>
                <MaterialCommunityIcons name="shield-check" size={20} color={colors.primaryLight} />
                <Text style={styles.startStatText}>Data stays{'\n'}private</Text>
              </View>
            </View>

            <TouchableOpacity onPress={startTrip} disabled={starting} activeOpacity={0.85} style={{ width: '100%' }}>
              <LinearGradient
                colors={gradients.primaryBright as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.startBtn, shadows.lg]}
              >
                <MaterialCommunityIcons name="play" size={22} color="#fff" />
                <Text style={styles.startBtnText}>{starting ? 'Starting...' : 'Start Trip'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Glassmorphism stats panel */}
      <View style={styles.statsWrap}>
        <BlurView intensity={40} tint="dark" style={styles.statsBlur}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.statsRow}>
              <StatCard label="Distance" value={`${distanceKm.toFixed(1)} km`} accentColor={colors.primary} />
              <StatCard label="Duration" value={formatTime(elapsedSeconds)} accentColor={colors.accent} />
              <StatCard label="Events" value={eventCount} sub={lastEventLabel ?? undefined} accentColor={colors.warning} />
            </View>
          </Animated.View>
        </BlurView>
      </View>

      {/* End trip button */}
      <View style={styles.endWrap}>
        <TouchableOpacity onPress={endTrip} activeOpacity={0.85}>
          <LinearGradient
            colors={gradients.danger as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.endBtn, shadows.md]}
          >
            <MaterialCommunityIcons name="stop" size={20} color="#fff" />
            <Text style={styles.endBtnText}>End Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  // Start screen
  startContainer: { flex: 1 },
  startGradient: { flex: 1 },
  startContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  startIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  startTitle: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
  startSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  startStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  startStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  startStatText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  startStatDivider: { width: 1, height: 40, backgroundColor: colors.border },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  startBtnText: { ...typography.h2, color: '#fff' },
  // Active trip
  statsWrap: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  statsBlur: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  endWrap: {
    position: 'absolute',
    bottom: 100,
    left: spacing.xl,
    right: spacing.xl,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  endBtnText: { ...typography.h2, color: '#fff' },
});
