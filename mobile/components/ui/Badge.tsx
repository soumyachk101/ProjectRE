import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../constants/theme';
import { EventType, Severity } from '../../types';
import { eventColors, severityColors } from '../../constants/theme';

const EVENT_ICONS: Record<EventType | 'anomaly', string> = {
  speed_breaker: '⚡',
  pothole: '🕳',
  broken_patch: '⚠️',
  resolved: '✓',
  anomaly: '•',
};

interface EventBadgeProps {
  type: EventType;
}

export function EventBadge({ type }: EventBadgeProps) {
  const color = eventColors[type] ?? colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>
        {EVENT_ICONS[type]} {type.replace('_', ' ')}
      </Text>
    </View>
  );
}

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const color = severityColors[severity];
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.label,
    textTransform: 'uppercase',
  },
});
