import React from 'react';
import { Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, typography } from '../../constants/theme';
import { PressableScale } from './PressableScale';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, icon }: ButtonProps) {
  if (variant === 'ghost') {
    return (
      <PressableScale onPress={onPress} disabled={disabled || loading} style={style}>
        <LinearGradient
          colors={['transparent', 'transparent']}
          style={[styles.base, styles.ghost]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryLight} size="small" />
          ) : (
            <Text style={[styles.label, { color: colors.primaryLight }]}>{label}</Text>
          )}
        </LinearGradient>
      </PressableScale>
    );
  }

  const gradientColors = variant === 'danger'
    ? gradients.danger
    : variant === 'accent'
    ? gradients.accent
    : gradients.primary;

  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} style={style}>
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, shadows.md, disabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.label, { color: '#ffffff' }]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});
