import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { EventType } from '../../types';
import { colors, typography } from '../../constants/theme';
import { useEventsStore } from '../../store/events';

const EVENT_LABELS: Record<EventType, string> = {
  pothole: 'POTHOLE\nAHEAD',
  speed_breaker: 'SPEED BREAKER\nAHEAD',
  broken_patch: 'BROKEN PATCH\nAHEAD',
  anomaly: 'ANOMALY\nDETECTED',
};

const EVENT_ICONS: Record<EventType, string> = {
  pothole: '🕳️',
  speed_breaker: '⚡',
  broken_patch: '⚠️',
  anomaly: '•',
};

const ALERT_COLORS: Record<EventType, string> = {
  pothole: '#ef4444',
  speed_breaker: '#f59e0b',
  broken_patch: '#f97316',
  anomaly: '#94a3b8',
};

export function AlertOverlay() {
  const alert = useEventsStore((s) => s.alert);
  const clearAlert = useEventsStore((s) => s.clearAlert);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alert) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Animated.sequence([
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      ),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(clearAlert);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  const color = ALERT_COLORS[alert.type];

  return (
    <Modal transparent animationType="none" visible={!!alert}>
      <Animated.View style={[styles.overlay, { backgroundColor: color, opacity: opacityAnim }]}>
        <Animated.View style={[styles.content, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.icon}>{EVENT_ICONS[alert.type]}</Text>
          <Text style={styles.title}>{EVENT_LABELS[alert.type]}</Text>
          <Text style={styles.distance}>{alert.distanceM} meters</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 44,
  },
  distance: {
    ...typography.h2,
    color: 'rgba(255,255,255,0.85)',
  },
});
