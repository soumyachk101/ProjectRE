import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trip } from '../../types';
import { colors, radius, spacing, typography } from '../../constants/theme';

const VEHICLE_ICONS: Record<string, string> = {
  two_wheeler: '🏍️',
  three_wheeler: '🛺',
  four_wheeler: '🚗',
};

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const icon = VEHICLE_ICONS[trip.vehicle_type ?? 'two_wheeler'] ?? '🚗';
  const startTime = trip.started_at
    ? new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const duration =
    trip.started_at && trip.ended_at
      ? Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000)
      : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <View>
          <Text style={styles.time}>{startTime} Trip</Text>
          <Text style={styles.meta}>
            {trip.distance_km?.toFixed(1) ?? '—'} km
            {duration !== null ? ` · ${duration} min` : ''}
          </Text>
        </View>
      </View>
      {trip.event_count !== undefined && (
        <Text style={styles.events}>{trip.event_count} event{trip.event_count !== 1 ? 's' : ''} detected</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: { fontSize: 28 },
  time: { ...typography.h3, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  events: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
});
