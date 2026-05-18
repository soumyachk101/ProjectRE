import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ConfirmedEvent, EventType } from '../../types';
import { eventColors, eventGradients, radius } from '../../constants/theme';

const EVENT_ICONS: Record<EventType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  speed_breaker: 'alert-circle',
  pothole: 'circle-off-outline',
  broken_patch: 'road-variant',
  anomaly: 'help-circle-outline',
};

interface EventMarkerProps {
  event: ConfirmedEvent;
  onPress: (event: ConfirmedEvent) => void;
}

export function EventMarker({ event, onPress }: EventMarkerProps) {
  const color = eventColors[event.event_type] ?? '#94a3b8';
  const gradient = eventGradients[event.event_type] ?? eventGradients.anomaly;
  const trailCount = event.trail_count;
  const isHighConfidence = trailCount >= 10;
  const isMedium = trailCount >= 3;

  return (
    <Marker
      coordinate={{ latitude: event.lat, longitude: event.lng }}
      onPress={() => onPress(event)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -22 }}
      accessibilityLabel={`${event.event_type} event, ${trailCount} confirmations`}
    >
      <View style={styles.container}>
        {/* Outer halo for confidence */}
        {isHighConfidence && (
          <View style={[styles.haloOuter, { backgroundColor: color + '22' }]} />
        )}
        {isMedium && (
          <View style={[styles.halo, { backgroundColor: color + '33', borderColor: color + '66' }]} />
        )}

        {/* Drop pin body */}
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.pin,
            {
              shadowColor: color,
              shadowOpacity: 0.65,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 10,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={EVENT_ICONS[event.event_type]}
            size={20}
            color="#fff"
          />
        </LinearGradient>

        {/* Pointer tail */}
        <View style={[styles.pointer, { borderTopColor: color }]} />

        {/* Ground dot under tail */}
        <View style={[styles.groundDot, { backgroundColor: color }]} />

        {/* Trail count badge */}
        {trailCount > 1 && (
          <View style={[styles.countBadge, { borderColor: color }]}>
            <Text style={styles.countText}>{trailCount > 99 ? '99+' : trailCount}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 64,
    height: 78,
  },
  haloOuter: {
    position: 'absolute',
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  halo: {
    position: 'absolute',
    top: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    marginTop: 6,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  groundDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 1,
    opacity: 0.85,
  },
  countBadge: {
    position: 'absolute',
    top: 0,
    right: 6,
    backgroundColor: '#0a0b13',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
});
