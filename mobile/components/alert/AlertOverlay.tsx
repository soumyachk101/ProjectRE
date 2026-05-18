import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EventType } from '../../types';
import { colors, typography } from '../../constants/theme';
import { useEventsStore } from '../../store/events';

const EVENT_LABELS: Record<EventType, string> = {
  pothole: 'POTHOLE\nAHEAD',
  speed_breaker: 'SPEED BREAKER\nAHEAD',
  broken_patch: 'BROKEN PATCH\nAHEAD',
  anomaly: 'ANOMALY\nDETECTED',
};

const EVENT_ICONS: Record<EventType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  pothole: 'circle-off-outline',
  speed_breaker: 'alert-circle',
  broken_patch: 'road-variant',
  anomaly: 'help-circle-outline',
};

const ALERT_COLORS: Record<EventType, [string, string, string]> = {
  pothole: ['#f87171', '#ef4444', '#dc2626'],
  speed_breaker: ['#fbbf24', '#f59e0b', '#d97706'],
  broken_patch: ['#fb923c', '#f97316', '#ea580c'],
  anomaly: ['#94a3b8', '#64748b', '#475569'],
};

export function AlertOverlay() {
  const alert = useEventsStore((s) => s.alert);
  const clearAlert = useEventsStore((s) => s.clearAlert);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (!alert) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 350, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      { iterations: 4 }
    ).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 250, useNativeDriver: true }),
      ]).start(clearAlert);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  const colors3 = ALERT_COLORS[alert.type];

  return (
    <Modal transparent animationType="none" visible={!!alert}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <LinearGradient
          colors={colors3}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        >
          <Animated.View
            style={[
              styles.content,
              {
                transform: [
                  { scale: pulseAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={EVENT_ICONS[alert.type]}
                size={56}
                color="#fff"
              />
            </View>
            <Text style={styles.title}>{EVENT_LABELS[alert.type]}</Text>
            <View style={styles.distancePill}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color="rgba(255,255,255,0.12)" />
              <Text style={styles.distance}>{alert.distanceM} meters</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  distance: {
    ...typography.h2,
    color: 'rgba(255,255,255,0.95)',
  },
});
