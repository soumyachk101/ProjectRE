import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useEventsStore } from '../../store/events';
import { useTripStore } from '../../store/trip';
import { ConfirmedEvent, EventType } from '../../types';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { eventColors } from '../../constants/theme';
import { EventMarker } from '../../components/map/EventMarker';
import { EventDetailSheet } from '../../components/map/EventDetailSheet';

const FILTER_OPTIONS: { key: EventType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pothole', label: '🔴' },
  { key: 'speed_breaker', label: '🟡' },
  { key: 'broken_patch', label: '🟠' },
];

export default function HomeScreen() {
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
    enabled: locationReady,
  });

  useEffect(() => {
    if (eventsData?.data) setNearbyEvents(eventsData.data as ConfirmedEvent[]);
  }, [eventsData]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(newRegion);
      setLocationReady(true);
      mapRef.current?.animateToRegion(newRegion, 800);
    })();
  }, []);

  const filteredEvents = filter === 'all'
    ? nearbyEvents
    : nearbyEvents.filter((e) => e.event_type === filter);

  return (
    <View style={styles.container}>
      {/* Active trip pill — per UIUX §5.4 */}
      {activeTrip && (
        <TouchableOpacity
          style={styles.activePill}
          onPress={() => router.push('/trip/active')}
        >
          <View style={styles.pulse} />
          <Text style={styles.pillText}>● SENSING</Text>
        </TouchableOpacity>
      )}

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={darkMapStyle}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {filteredEvents.map((event) => (
          <EventMarker key={event.id} event={event} onPress={setSelectedEvent} />
        ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🛣️ RoadSense</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Text>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterChip, filter === opt.key && styles.filterChipActive]}
            onPress={() => setFilter(opt.key)}
          >
            <Text style={[styles.filterLabel, filter === opt.key && { color: colors.textPrimary }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {activeTrip ? (
          <TouchableOpacity style={styles.activeTripBtn} onPress={() => router.push('/trip/active')}>
            <Text style={styles.activeTripBtnText}>🟢 Trip Active — Tap to view</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/trip/active')}>
            <Text style={styles.startBtnText}>🏁 Start Trip</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.eventsNearby}>📍 {nearbyEvents.length} events near you</Text>
      </View>

      {selectedEvent && (
        <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    position: 'absolute', top: 52, left: spacing.md, right: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 10,
  },
  logo: { ...typography.h2, color: colors.textPrimary },
  iconBtn: {
    backgroundColor: colors.surface + 'cc',
    padding: spacing.sm, borderRadius: radius.card,
  },
  activePill: {
    position: 'absolute', top: 44, alignSelf: 'center',
    backgroundColor: colors.success + 'dd',
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.pill, zIndex: 20,
    borderWidth: 1, borderColor: colors.success,
  },
  pulse: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success,
  },
  pillText: { ...typography.label, color: colors.textPrimary, textTransform: 'uppercase' },
  filterBar: {
    position: 'absolute', bottom: 130, left: spacing.md, right: spacing.md,
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.surface + 'dd',
    borderRadius: radius.pill, padding: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
    zIndex: 10,
  },
  filterChip: {
    flex: 1, alignItems: 'center', padding: spacing.sm,
    borderRadius: radius.pill,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterLabel: { ...typography.body, color: colors.textSecondary },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface + 'ee',
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.md, gap: spacing.sm, zIndex: 10,
  },
  startBtn: {
    backgroundColor: colors.primary, borderRadius: radius.card,
    padding: spacing.md, alignItems: 'center',
  },
  startBtnText: { ...typography.h3, color: colors.textPrimary },
  activeTripBtn: {
    backgroundColor: colors.success + '22', borderRadius: radius.card,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.success,
  },
  activeTripBtnText: { ...typography.h3, color: colors.success },
  eventsNearby: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});

// Mapbox-style dark map — works with Google Maps on Android
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d0221' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0221' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1035' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#241548' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06b6d422' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
