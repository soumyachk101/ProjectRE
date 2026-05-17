import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { QualityScore } from '../../types';
import { colors, radius, spacing, typography, shadows, qualityColors } from '../../constants/theme';

interface QualityBadgeProps {
  quality: QualityScore;
}

export function QualityBadge({ quality }: QualityBadgeProps) {
  const color = qualityColors[quality.label];

  return (
    <View style={[styles.badge, { borderColor: color + '40' }, shadows.sm]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.score, { color }]}>{quality.score}</Text>
      <Text style={styles.label}>{quality.label}</Text>
    </View>
  );
}

interface QualityInlineProps {
  quality: QualityScore;
}

export function QualityInline({ quality }: QualityInlineProps) {
  const color = qualityColors[quality.label];

  return (
    <View style={styles.inline}>
      <MaterialCommunityIcons name="road-variant" size={16} color={color} />
      <Text style={[styles.inlineText, { color }]}>
        Road quality: {quality.score}/100 ({quality.label})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  score: {
    ...typography.h3,
    fontSize: 14,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
