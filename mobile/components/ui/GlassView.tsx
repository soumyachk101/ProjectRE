import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../constants/theme';

interface GlassViewProps {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle;
  tint?: 'dark' | 'light' | 'default';
}

export function GlassView({ children, intensity = 80, style, tint = 'light' }: GlassViewProps) {
  return (
    <BlurView intensity={intensity} tint={tint} style={[styles.glass, style]}>
      <View style={styles.inner}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
});
