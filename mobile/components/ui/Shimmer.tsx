import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../constants/theme';

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-200, 200]) }],
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height: height, borderRadius, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={gradients.shimmer as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

interface ShimmerRowProps {
  count?: number;
  itemHeight?: number;
  gap?: number;
}

export function ShimmerRow({ count = 3, itemHeight = 80, gap = 12 }: ShimmerRowProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer
          key={i}
          width="100%"
          height={itemHeight}
          borderRadius={12}
          style={{ marginBottom: i < count - 1 ? gap : 0 }}
        />
      ))}
    </>
  );
}
