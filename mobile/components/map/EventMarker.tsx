import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { ConfirmedEvent, EventType } from '../../types';
import { eventColors } from '../../constants/theme';

const EVENT_ICONS: Record<EventType, string> = {
  speed_breaker: '⚡',
  pothole: '🕳',
  broken_patch: '⚠️',
  anomaly: '•',
};

interface EventMarkerProps {
  event: ConfirmedEvent;
  onPress: (event: ConfirmedEvent) => void;
}

export function EventMarker({ event, onPress }: EventMarkerProps) {
  const color = eventColors[event.event_type] ?? '#94a3b8';
  const trailCount = event.trail_count;

  // Opacity based on confirmation level — per UIUX §5.1
  const opacity = trailCount < 3 ? 0.4 : trailCount < 10 ? 0.7 : 1.0;
  const hasShadow = trailCount >= 10;

  return (
    <Marker
      coordinate={{ latitude: event.lat, longitude: event.lng }}
      onPress={() => onPress(event)}
      tracksViewChanges={false}
      accessibilityLabel={`${event.event_type} event, ${trailCount} confirmations`}
    >
      <View
        style={[
          styles.marker,
          {
            backgroundColor: color + Math.round(opacity * 255).toString(16).padStart(2, '0'),
            borderColor: color,
            shadowColor: hasShadow ? color : 'transparent',
            shadowOpacity: hasShadow ? 0.8 : 0,
            shadowRadius: 8,
            elevation: hasShadow ? 8 : 2,
          },
        ]}
      >
        <Text style={styles.icon}>{EVENT_ICONS[event.event_type]}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
});
