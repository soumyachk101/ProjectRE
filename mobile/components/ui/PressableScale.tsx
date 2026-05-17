import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
  style?: ViewStyle;
  disabled?: boolean;
}


export function PressableScale({
  children,
  onPress,
  scale = 0.97,
  style,
  disabled,
}: PressableScaleProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        !disabled && pressed && { transform: [{ scale }] },
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
});
