import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Trip } from '../../types';
import { colors, gradients, radius, spacing, shadows, typography, eventColors } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';

const VEHICLE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  two_wheeler: 'motorbike',
  three_wheeler: 'rickshaw',
  four_wheeler: 'car',
};

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const iconName = VEHICLE_ICONS[trip.vehicle_type ?? 'two_wheeler'] ?? 'car';
  const startTime = trip.started_at
    ? new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const duration =
    trip.started_at && trip.ended_at
      ? Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000)
      : null;

  const eventCount = trip.event_count ?? 0;
  const accentColor = eventCount > 5 ? eventColors.pothole : eventCount > 0 ? eventColors.speed_breaker : colors.primary;

  return (
    <PressableScale onPress={onPress} style={styles.wrapper}>
      <LinearGradient
        colors={gradients.card as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadows.sm]}
      >
        <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={iconName} size={22} color={colors.primaryLight} />
            </View>
            <View style={styles.info}>
              <Text style={styles.time}>{startTime} Trip</Text>
              <Text style={styles.meta}>
                {trip.distance_km?.toFixed(1) ?? '—'} km
                {duration !== null ? ` · ${duration} min` : ''}
              </Text>
            </View>
            {eventCount > 0 && (
              <View style={styles.eventPill}>
                <Text style={styles.eventCount}>{eventCount}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: colors.glass,
  },
  accentStripe: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(0,122,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.14)',
  },
  info: {
    flex: 1,
  },
  time: { ...typography.h3, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  eventPill: {
    backgroundColor: 'rgba(0,122,255,0.10)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.18)',
  },
  eventCount: {
    ...typography.label,
    color: colors.accent,
  },
});
