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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { darkMapStyle } from '../../constants/mapStyle';

const EVENT_TYPES: { key: EventType; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }[] = [
  { key: 'pothole', icon: 'circle-off-outline', label: 'Pothole' },
  { key: 'speed_breaker', icon: 'alert-circle', label: 'Speed Breaker' },
  { key: 'broken_patch', icon: 'road-variant', label: 'Broken Patch' },
];

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [initialRegion, setInitialRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setInitialRegion(region);
        mapRef.current?.animateToRegion(region);
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
        initialRegion={initialRegion ?? undefined}
        customMapStyle={darkMapStyle}
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

      <LinearGradient
        colors={['rgba(250,250,247,0.95)', 'rgba(250,250,247,0.5)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.headerWrap, { top: insets.top + 12 }]}>
        <BlurView intensity={90} tint="light" style={styles.headerBlur}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="map-marker-plus" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>COMMUNITY REPORT</Text>
              <Text style={styles.headerTitle}>Report an issue</Text>
              <Text style={styles.headerSub}>Tap map to drop a pin, then choose a type</Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Event type selector */}
      <View style={[styles.typeWrap, { top: insets.top + 106 }]}>
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
          <Animated.View entering={FadeInDown} style={[styles.successBanner, shadows.md]}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
            </View>
            <Text style={styles.successText}>Report submitted</Text>
          </Animated.View>
        ) : (
          <Button
            label={pinLocation ? (selectedType ? 'Submit Report' : 'Choose a type') : 'Tap map to place pin'}
            onPress={handleSubmit}
            variant="accent"
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
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  headerWrap: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...shadows.md,
  },
  headerBlur: {
    padding: spacing.md,
    backgroundColor: colors.glass,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(47,72,88,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(47,72,88,0.18)',
  },
  headerEyebrow: { ...typography.label, color: colors.accent, marginBottom: 2 },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  typeWrap: {
    position: 'absolute',
    top: 144,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    ...shadows.sm,
  },
  typeBlur: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glass,
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
    gap: 10,
    backgroundColor: colors.glass,
    borderRadius: radius.pill,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { ...typography.h3, color: colors.success },
});
