import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import MapView, { Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { api } from '../../services/api';
import { SensorEngine, VehicleType, Placement } from '../../services/SensorEngine';
import { useTripStore } from '../../store/trip';
import { useEventsStore } from '../../store/events';
import { PocCandidate } from '../../types';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatCard } from '../../components/ui/StatCard';

const OSM_TILE_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function ActiveTripScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const engineRef = useRef<SensorEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);

  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }>({
    latitude: 23.55, longitude: 87.31, latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  // Live telemetry features
  const [liveSensors, setLiveSensors] = useState({ x: 0, y: 0, z: 0 });
  const [liveCoords, setLiveCoords] = useState({ latitude: 0, longitude: 0 });
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentDetections, setRecentDetections] = useState<{ id: string; type: string; time: string }[]>([]);

  const soundEnabledRef = useRef(true);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playAlertSound = async (eventType: string) => {
    // Placeholder for future audio alerts — haptics are handled in handlePocDetected
  };

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

  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const pocBufferRef = useRef<PocCandidate[]>([]);
  const lastCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const incrementDistance = useTripStore((s) => s.incrementDistance);

  const handlePocDetected = useCallback((poc: PocCandidate) => {
    incrementEvents();
    const eventType = poc.z_value < 0 ? 'pothole' : 'speed_breaker';
    setLastEvent(eventType);

    const id = Math.random().toString(36).substring(7);
    setRecentDetections((prev) => [
      { id, type: eventType, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4)
    ]);

    if (eventType === 'pothole') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (soundEnabledRef.current) {
      playAlertSound(eventType);
    }
  }, []);

  const handleFlush = useCallback(async (pocs: PocCandidate[]) => {
    pocBufferRef.current.push(...pocs);
  }, []);

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleManualReport = async (type: 'pothole' | 'speed_breaker' | 'broken_patch') => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      await api.events.report({ event_type: type, lat: loc.coords.latitude, lng: loc.coords.longitude });
      incrementEvents();
      setLastEvent(type);

      const id = Math.random().toString(36).substring(7);
      setRecentDetections((prev) => [
        { id, type, time: `${new Date().toLocaleTimeString()} (Confirmed)` },
        ...prev.slice(0, 4)
      ]);

      if (type === 'pothole') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (soundEnabledRef.current) {
        playAlertSound(type);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to report event');
    }
  };

  const startTrip = async () => {
    setStarting(true);
    try {
      const vehicleType = (await SecureStore.getItemAsync('vehicleType')) as VehicleType ?? 'two_wheeler';
      const placement = (await SecureStore.getItemAsync('placement')) as Placement ?? 'mounter';
      const loc = await Location.getCurrentPositionAsync({});

      setLiveCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      const speedMs = loc.coords.speed ?? 0;
      setLiveSpeed(Math.max(0, speedMs * 3.6));

      const { data: trip } = await api.trips.create(vehicleType, placement);
      setActiveTrip(trip);

      const engine = new SensorEngine({
        tripId: trip.id,
        vehicleType,
        placement,
        onPocDetected: handlePocDetected,
        onFlush: handleFlush,
        onSensorData: (data) => {
          setLiveSensors(data);
        }
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
          setLiveCoords(point);
          const speedMs = loc.coords.speed ?? 0;
          setLiveSpeed(Math.max(0, speedMs * 3.6));

          // Track distance
          if (lastCoordRef.current) {
            const d = haversineKm(lastCoordRef.current.lat, lastCoordRef.current.lng, point.latitude, point.longitude);
            if (d > 0.005) incrementDistance(d); // ignore GPS noise < 5m
          }
          lastCoordRef.current = { lat: point.latitude, lng: point.longitude };

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
    if (!activeTrip || ending) return;
    setEnding(true);

    // Stop sensors and location immediately
    engineRef.current?.stop();
    locSubRef.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);

    // Navigate first — user should see home screen immediately
    router.replace('/(tabs)/home');
    resetTrip();

    // Fire API calls in parallel, don't block navigation
    const tripId = activeTrip.id;
    const pocs = [...pocBufferRef.current];
    pocBufferRef.current = [];

    const tasks: Promise<any>[] = [api.trips.end(tripId)];
    if (pocs.length > 0) {
      tasks.push(api.trips.uploadPoc(tripId, pocs));
    }

    const results = await Promise.allSettled(tasks);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn('Trip sync issues:', failed);
    }
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
        <LinearGradient colors={gradients.aurora as any} style={StyleSheet.absoluteFill} />
        <View style={styles.orbOne} />
        <View style={styles.orbTwo} />
        <Animated.View entering={FadeInDown.duration(500)} style={styles.startContent}>
          <Text style={styles.startEyebrow}>NEW SESSION</Text>
          <Animated.View style={iconStyle}>
            <LinearGradient
              colors={gradients.accent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startIconCircle}
            >
              <MaterialCommunityIcons name="navigation-variant" size={48} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.startTitle}>Ready to ride?</Text>
          <Text style={styles.startSub}>
            RoadSense will detect road anomalies{'\n'}as you drive
          </Text>

          <View style={styles.startStats}>
            <View style={styles.startStatItem}>
              <View style={styles.startStatIcon}>
                <MaterialCommunityIcons name="cellphone-arrow-down" size={18} color={colors.accent} />
              </View>
              <Text style={styles.startStatText}>Keep phone{'\n'}steady</Text>
            </View>
            <View style={styles.startStatDivider} />
            <View style={styles.startStatItem}>
              <View style={styles.startStatIcon}>
                <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.accent} />
              </View>
              <Text style={styles.startStatText}>Route auto{'\n'}tracked</Text>
            </View>
            <View style={styles.startStatDivider} />
            <View style={styles.startStatItem}>
              <View style={styles.startStatIcon}>
                <MaterialCommunityIcons name="shield-check" size={18} color={colors.success} />
              </View>
              <Text style={styles.startStatText}>Data stays{'\n'}private</Text>
            </View>
          </View>

          <TouchableOpacity onPress={startTrip} disabled={starting} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient
              colors={gradients.accent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.startBtn, shadows.lg]}
            >
              <MaterialCommunityIcons name="play" size={22} color="#fff" />
              <Text style={styles.startBtnText}>{starting ? 'Starting…' : 'Start Trip'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} flipY={false} zIndex={-1} />
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
      <View style={[styles.statsWrap, { top: insets.top + 12 }]}>
        <BlurView intensity={80} tint="light" style={styles.statsBlur}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.statsRow}>
              <StatCard label="Distance" value={`${distanceKm.toFixed(1)} km`} accentColor={colors.primary} />
              <StatCard label="Duration" value={formatTime(elapsedSeconds)} accentColor={colors.accent} />
              <StatCard label="Events" value={eventCount} sub={lastEventLabel ?? undefined} accentColor={colors.warning} />
            </View>
          </Animated.View>
        </BlurView>
      </View>

      {/* Real-time Telemetry & Confirmations Feed */}
      <View style={styles.telemetryWrap}>
        <BlurView intensity={80} tint="light" style={styles.telemetryBlur}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>Live Telemetry</Text>
            <TouchableOpacity 
              style={[styles.soundBtn, soundEnabled && styles.soundBtnActive]} 
              onPress={() => setSoundEnabled(!soundEnabled)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={soundEnabled ? "volume-high" : "volume-off"} 
                size={16} 
                color={soundEnabled ? colors.success : colors.textMuted} 
              />
              <Text style={[styles.soundText, { color: soundEnabled ? colors.success : colors.textMuted }]}>
                {soundEnabled ? "Sound ON" : "Sound OFF"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCol}>
              <Text style={styles.telemetryLabel}>X Force (g)</Text>
              <Text style={styles.telemetryValue}>{liveSensors.x.toFixed(3)}</Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View style={styles.telemetryCol}>
              <Text style={styles.telemetryLabel}>Y Force (g)</Text>
              <Text style={styles.telemetryValue}>{liveSensors.y.toFixed(3)}</Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View style={styles.telemetryCol}>
              <Text style={styles.telemetryLabel}>Z Force (g)</Text>
              <Text style={styles.telemetryValue}>{liveSensors.z.toFixed(3)}</Text>
            </View>
          </View>

          <View style={styles.telemetryDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="speedometer" size={16} color={colors.primary} />
              <Text style={styles.detailText}>Speed: <Text style={styles.detailHighlight}>{liveSpeed.toFixed(1)} km/h</Text></Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="earth" size={16} color={colors.accent} />
              <Text style={styles.detailText}>Coords: <Text style={styles.detailHighlight}>{liveCoords.longitude.toFixed(5)}, {liveCoords.latitude.toFixed(5)}</Text></Text>
            </View>
          </View>

          {recentDetections.length > 0 && (
            <View style={styles.feedContainer}>
              <Text style={styles.feedTitle}>Session Confirmations & Detections</Text>
              {recentDetections.map((det) => (
                <View key={det.id} style={styles.feedItem}>
                  <MaterialCommunityIcons 
                    name={det.type === 'pothole' ? "circle-off-outline" : det.type === 'speed_breaker' ? "alert-circle" : "road-variant"} 
                    size={14} 
                    color={det.type === 'pothole' ? "#ef4444" : det.type === 'speed_breaker' ? "#f59e0b" : "#f97316"} 
                  />
                  <Text style={styles.feedItemText}>
                    {det.type.replace('_', ' ').toUpperCase()} detected
                  </Text>
                  <Text style={styles.feedItemTime}>{det.time}</Text>
                </View>
              ))}
            </View>
          )}
        </BlurView>
      </View>

      {/* Quick report buttons */}
      <View style={styles.quickReportWrap}>
        <TouchableOpacity
          style={styles.quickReportBtn}
          onPress={() => handleManualReport('pothole')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="circle-off-outline" size={22} color="#ef4444" />
          <Text style={styles.quickReportLabel}>Pothole</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickReportBtn}
          onPress={() => handleManualReport('speed_breaker')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="alert-circle" size={22} color="#f59e0b" />
          <Text style={styles.quickReportLabel}>Breaker</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickReportBtn}
          onPress={() => handleManualReport('broken_patch')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="road-variant" size={22} color="#f97316" />
          <Text style={styles.quickReportLabel}>Patch</Text>
        </TouchableOpacity>
      </View>

      {/* End trip button */}
      <View style={styles.endWrap}>
        <TouchableOpacity onPress={endTrip} disabled={ending} activeOpacity={0.85}>
          <LinearGradient
            colors={ending ? gradients.primary as any : gradients.danger as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.endBtn, shadows.md, ending && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name="stop" size={20} color="#fff" />
            <Text style={styles.endBtnText}>{ending ? 'Ending…' : 'End Trip'}</Text>
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
  startContainer: { flex: 1, backgroundColor: colors.bg },
  orbOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(47,72,88,0.08)',
    top: -60,
    right: -120,
  },
  orbTwo: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(47,72,88,0.08)',
    bottom: -80,
    left: -140,
  },
  startEyebrow: { ...typography.label, color: colors.accent, marginBottom: spacing.sm },
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
    gap: 8,
  },
  startStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(47,72,88,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statsBlur: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickReportWrap: {
    position: 'absolute',
    bottom: 170,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickReportBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.card,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickReportLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
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
  telemetryWrap: {
    position: 'absolute',
    top: 175,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.sm,
  },
  telemetryBlur: {
    padding: spacing.md,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  telemetryTitle: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  soundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  soundBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  soundText: {
    fontSize: 10,
    fontWeight: '700',
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  telemetryCol: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  telemetryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  detailHighlight: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  feedContainer: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  feedTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  feedItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  feedItemTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
