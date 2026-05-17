import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, typography } from '../../constants/theme';
import { EventType, Severity } from '../../types';
import { eventColors, eventGradients, severityColors } from '../../constants/theme';

const EVENT_ICONS: Record<EventType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  speed_breaker: 'alert-circle',
  pothole: 'circle-off-outline',
  broken_patch: 'road-variant',
  anomaly: 'help-circle-outline',
};

interface EventBadgeProps {
  type: EventType;
}

export function EventBadge({ type }: EventBadgeProps) {
  const color = eventColors[type] ?? colors.textMuted;
  const gradient = eventGradients[type] ?? eventGradients.anomaly;

  return (
    <LinearGradient
      colors={gradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.badge}
    >
      <MaterialCommunityIcons
        name={EVENT_ICONS[type]}
        size={13}
        color="#fff"
        style={{ marginRight: 4 }}
      />
      <Text style={styles.text}>{type.replace('_', ' ')}</Text>
    </LinearGradient>
  );
}

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const color = severityColors[severity];
  return (
    <LinearGradient
      colors={[color + 'cc', color + '88'] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.badge}
    >
      <Text style={styles.text}>{severity}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...typography.label,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
});
