import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ConfirmedEvent, EventType } from '../../types';
import { eventColors, radius } from '../../constants/theme';

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
  const trailCount = event.trail_count;
  const opacity = trailCount < 3 ? 0.5 : trailCount < 10 ? 0.8 : 1.0;
  const isHighConfidence = trailCount >= 10;

  return (
    <Marker
      coordinate={{ latitude: event.lat, longitude: event.lng }}
      onPress={() => onPress(event)}
      tracksViewChanges={false}
      accessibilityLabel={`${event.event_type} event, ${trailCount} confirmations`}
    >
      <View style={styles.container}>
        {/* Outer glow ring for high-confidence events */}
        {isHighConfidence && (
          <View style={[styles.glowRing, { borderColor: color + '40' }]} />
        )}
        {/* Main marker */}
        <View
          style={[
            styles.marker,
            {
              backgroundColor: color,
              opacity,
              shadowColor: color,
              shadowOpacity: isHighConfidence ? 0.6 : 0.3,
              shadowRadius: isHighConfidence ? 10 : 5,
              elevation: isHighConfidence ? 8 : 4,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={EVENT_ICONS[event.event_type]}
            size={18}
            color="#fff"
          />
        </View>
        {/* Trail count badge */}
        {trailCount > 1 && (
          <View style={styles.countBadge}>
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
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  marker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#1a1035',
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
  },
  countText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a78bfa',
  },
});
