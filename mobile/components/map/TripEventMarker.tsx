import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { eventColors, shadows } from '../../constants/theme';

interface TripEventMarkerProps {
  coordinate: { latitude: number; longitude: number };
  eventType: 'pothole' | 'speed_breaker' | 'broken_patch' | string;
  isLive?: boolean;
}

export function TripEventMarker({ coordinate, eventType, isLive = false }: TripEventMarkerProps) {
  const color = (eventColors as any)[eventType] ?? '#f97316';
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isLive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [isLive, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={isLive} // Only track changes if it's animating/live for performance
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <Animated.View style={[styles.markerContainer, animatedStyle]}>
        {/* Outer Ring */}
        <View style={[styles.outerRing, { borderColor: color, backgroundColor: color + '22' }]}>
          {/* Inner Dot */}
          <View style={[styles.innerDot, { backgroundColor: color }]} />
        </View>
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  outerRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
