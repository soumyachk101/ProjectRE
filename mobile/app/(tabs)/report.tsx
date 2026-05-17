import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EventType } from '../../types';
import { api } from '../../services/api';
import { colors, gradients, spacing, typography, radius, shadows, eventColors } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

const EVENT_TYPES: { key: EventType; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }[] = [
  { key: 'pothole', icon: 'circle-off-outline', label: 'Pothole' },
  { key: 'speed_breaker', icon: 'alert-circle', label: 'Speed Breaker' },
  { key: 'broken_patch', icon: 'road-variant', label: 'Broken Patch' },
];

export default function ReportScreen() {
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    })();
  }, []);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinLocation({ lat: latitude, lng: longitude });
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!selectedType || !pinLocation) {
      Alert.alert('Missing info', 'Select event type and tap map to place pin');
      return;
    }
    setSubmitting(true);
    try {
      await api.events.report({
        event_type: selectedType,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
      });
      setSubmitted(true);
      setPinLocation(null);
      setSelectedType(null);
    } catch {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        onPress={handleMapPress}
      >
        {pinLocation && (
          <Marker
            coordinate={{ latitude: pinLocation.lat, longitude: pinLocation.lng }}
            pinColor={selectedType ? eventColors[selectedType] : colors.primary}
          />
        )}
      </MapView>

      {/* Header */}
      <View style={styles.headerWrap}>
        <BlurView intensity={40} tint="light" style={styles.headerBlur}>
          <Text style={styles.headerTitle}>Report Issue</Text>
          <Text style={styles.headerSub}>Tap map to place pin, select type, submit</Text>
        </BlurView>
      </View>

      {/* Event type selector */}
      <View style={styles.typeWrap}>
        <BlurView intensity={30} tint="light" style={styles.typeBlur}>
          <View style={styles.typeRow}>
            {EVENT_TYPES.map((t) => {
              const isActive = selectedType === t.key;
              const color = eventColors[t.key];
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeChip,
                    isActive && { backgroundColor: color + '20', borderColor: color },
                  ]}
                  onPress={() => { setSelectedType(t.key); setSubmitted(false); }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name={t.icon} size={18} color={isActive ? color : colors.textMuted} />
                  {isActive && <Text style={[styles.typeLabel, { color }]}>{t.label}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>

      {/* Submit button */}
      <View style={styles.submitWrap}>
        {submitted ? (
          <Animated.View entering={FadeInDown} style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>Report submitted!</Text>
          </Animated.View>
        ) : (
          <Button
            label={pinLocation ? 'Submit Report' : 'Tap map to place pin'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!pinLocation || !selectedType}
            icon={<MaterialCommunityIcons name="send" size={18} color="#fff" />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  headerWrap: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBlur: {
    padding: spacing.md,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  typeWrap: {
    position: 'absolute',
    top: 120,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBlur: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeLabel: {
    ...typography.label,
  },
  submitWrap: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  successText: { ...typography.h3, color: colors.success },
});
