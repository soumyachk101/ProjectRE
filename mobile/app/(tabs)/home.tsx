import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, UrlTile, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useEventsStore } from '../../store/events';
import { useTripStore } from '../../store/trip';
import { ConfirmedEvent, EventType } from '../../types';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eventColors } from '../../constants/theme';
import { EventMarker } from '../../components/map/EventMarker';
import { EventDetailSheet } from '../../components/map/EventDetailSheet';
import { SearchBar } from '../../components/map/SearchBar';
const OSM_TILE_URL = 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';

const FILTER_OPTIONS: { key: EventType | 'all'; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'layers-outline' },
  { key: 'pothole', label: 'Pothole', icon: 'circle-off-outline' },
  { key: 'speed_breaker', label: 'Breaker', icon: 'alert-circle' },
  { key: 'broken_patch', label: 'Patch', icon: 'road-variant' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState<Region>({
    latitude: 23.55, longitude: 87.31, latitudeDelta: 0.05, longitudeDelta: 0.05,
  });
  const [selectedEvent, setSelectedEvent] = useState<ConfirmedEvent | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const mapRef = useRef<MapView>(null);

  const filter = useEventsStore((s) => s.filter);
  const setFilter = useEventsStore((s) => s.setFilter);
  const setNearbyEvents = useEventsStore((s) => s.setNearbyEvents);
  const nearbyEvents = useEventsStore((s) => s.nearbyEvents);
  const activeTrip = useTripStore((s) => s.activeTrip);

  const { data: eventsData } = useQuery({
    queryKey: ['events', region.latitude, region.longitude],
    queryFn: () => api.events.nearby(region.latitude, region.longitude, 5000),
    refetchInterval: 30000,
  });

  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const liveDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const tripBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowAnim.value }],
  }));

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const userRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(userRegion);
      setLocationReady(true);
      mapRef.current?.animateToRegion(userRegion);
    })();
  }, []);

  useEffect(() => {
    if (eventsData?.data) {
      setNearbyEvents(eventsData.data as ConfirmedEvent[]);
    }
  }, [eventsData]);

  const filteredEvents = filter === 'all'
    ? nearbyEvents
    : nearbyEvents.filter((e) => e.event_type === filter);

  const handleEventPress = (event: ConfirmedEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseSheet = () => {
    setSelectedEvent(null);
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={setRegion}
      >
        <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} flipY={false} zIndex={1} />
        {filteredEvents.map((event) => (
          <EventMarker key={event.id} event={event} onPress={handleEventPress} />
        ))}
      </MapView>

      {/* Top Gradient Overlay for seamless blend */}
      <LinearGradient
        colors={['rgba(250,250,247,0.95)', 'rgba(250,250,247,0.55)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Glassmorphism header */}
      <View style={[styles.headerWrap, { top: insets.top + 12 }]}>
        <BlurView intensity={90} tint="light" style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.eyebrow}>LIVE ROAD INTELLIGENCE</Text>
              <Text style={styles.headerTitle}>RoadSense</Text>
              <Text style={styles.headerSub}>
                {locationReady ? `${nearbyEvents.length} events nearby` : 'Finding your location'}
              </Text>
            </View>
            <View style={styles.liveDot}>
              <Animated.View style={[styles.liveDotInner, liveDotStyle]} />
            </View>
          </View>
        </BlurView>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { top: insets.top + 82 }]}>
        <SearchBar
          onSelect={(lat, lng) => {
            mapRef.current?.animateToRegion({
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }}
        />
      </View>

      {/* Filter bar */}
      <View style={[styles.filterWrap, { top: insets.top + 130 }]}>
        <BlurView intensity={90} tint="light" style={styles.filterBlur}>
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((opt) => {
              const isActive = filter === opt.key;
              const optColor = opt.key === 'all' ? colors.primary : eventColors[opt.key as EventType] ?? colors.primary;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.filterChip,
                    isActive && { backgroundColor: optColor + '30', borderColor: optColor },
                  ]}
                  onPress={() => setFilter(opt.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={16}
                    color={isActive ? optColor : colors.textMuted}
                  />
                  {isActive && (
                    <Text style={[styles.filterLabel, { color: optColor }]}>{opt.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>

      {/* My Location button */}
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({});
          const userRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          setRegion(userRegion);
          mapRef.current?.animateToRegion(userRegion);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradients.surface as any}
          style={styles.locationBtnInner}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.accent} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Start Trip button */}
      {!activeTrip && (
        <View style={styles.tripBtnWrap}>
          <TouchableOpacity
            onPress={() => router.push('/trip/active')}
            activeOpacity={0.85}
          >
            <Animated.View style={tripBtnStyle}>
              <LinearGradient
                colors={gradients.accent as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tripBtn, shadows.lg]}
              >
                <MaterialCommunityIcons name="navigation-variant" size={22} color="#fff" />
                <Text style={styles.tripBtnText}>Start Trip</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}

      {/* Event detail sheet */}
      <EventDetailSheet
        event={selectedEvent}
        onClose={handleCloseSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  headerWrap: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...shadows.md,
  },
  headerBlur: {
    padding: spacing.lg,
    backgroundColor: colors.glass,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
    marginBottom: 3,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  searchWrap: {
    position: 'absolute',
    top: 120,
    left: spacing.md,
    right: spacing.md,
  },
  filterWrap: {
    position: 'absolute',
    top: 168,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    ...shadows.sm,
  },
  filterBlur: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glass,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterLabel: {
    ...typography.label,
  },
  locationBtn: {
    position: 'absolute',
    right: spacing.md,
    bottom: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...shadows.md,
  },
  locationBtnInner: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripBtnWrap: {
    position: 'absolute',
    bottom: 104,
    left: spacing.lg,
    right: spacing.lg,
  },
  tripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 19,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  tripBtnText: {
    ...typography.h2,
    color: '#ffffff',
  },
});
