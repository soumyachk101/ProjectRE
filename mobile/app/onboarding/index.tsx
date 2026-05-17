import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

const { width } = Dimensions.get('window');

type VehicleType = 'two_wheeler' | 'three_wheeler' | 'four_wheeler';
type PlacementType = 'mounter' | 'pocket' | 'dashboard';

const SLIDES = [
  {
    key: 'hook',
    dot: 0,
    content: () => (
      <View style={slide.center}>
        <Text style={slide.emoji}>🗺️</Text>
        <Text style={slide.headline}>India's roads are{'\n'}mapped by satellites.</Text>
        <Text style={slide.headline}>But potholes aren't.</Text>
        <Text style={[slide.headline, { color: colors.primary, marginTop: spacing.md }]}>Until now.</Text>
      </View>
    ),
  },
  {
    key: 'how',
    dot: 1,
    content: () => (
      <View style={slide.center}>
        <View style={slide.iconRow}>
          <Text style={slide.bigIcon}>📱</Text>
          <Text style={[slide.bigIcon, { color: colors.primary }]}>→</Text>
          <Text style={slide.bigIcon}>📡</Text>
          <Text style={[slide.bigIcon, { color: colors.primary }]}>→</Text>
          <Text style={slide.bigIcon}>🗺️</Text>
        </View>
        <Text style={slide.headline}>Just ride.{'\n'}RoadSense detects.{'\n'}The map updates.</Text>
        <Text style={[slide.subtext, { marginTop: spacing.md }]}>No tapping. No tagging.{'\n'}Fully automatic.</Text>
      </View>
    ),
  },
];

interface SetupData {
  vehicleType: VehicleType | null;
  placement: PlacementType | null;
}

function SetupSlide({ onDone }: { onDone: (d: SetupData) => void }) {
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [placement, setPlacement] = useState<PlacementType | null>(null);

  const vehicles: { key: VehicleType; icon: string; label: string }[] = [
    { key: 'two_wheeler', icon: '🏍️', label: 'Bike' },
    { key: 'three_wheeler', icon: '🛺', label: 'Auto' },
    { key: 'four_wheeler', icon: '🚗', label: 'Car' },
  ];

  const placements: { key: PlacementType; label: string }[] = [
    { key: 'mounter', label: 'Mounted on vehicle' },
    { key: 'pocket', label: 'In my pocket' },
    { key: 'dashboard', label: 'On dashboard' },
  ];

  return (
    <View style={[slide.center, { paddingHorizontal: spacing.xl }]}>
      <Text style={slide.sectionTitle}>One-time setup</Text>

      <Text style={slide.label}>My vehicle is:</Text>
      <View style={styles.vehicleRow}>
        {vehicles.map((v) => (
          <TouchableOpacity
            key={v.key}
            style={[styles.vehicleBtn, vehicle === v.key && styles.vehicleBtnActive]}
            onPress={() => setVehicle(v.key)}
          >
            <Text style={styles.vehicleIcon}>{v.icon}</Text>
            <Text style={styles.vehicleLabel}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[slide.label, { marginTop: spacing.lg }]}>My phone is usually:</Text>
      {placements.map((p) => (
        <TouchableOpacity
          key={p.key}
          style={[styles.radioRow, placement === p.key && styles.radioRowActive]}
          onPress={() => setPlacement(p.key)}
        >
          <View style={[styles.radioCircle, placement === p.key && styles.radioCircleFilled]} />
          <Text style={styles.radioLabel}>{p.label}</Text>
        </TouchableOpacity>
      ))}

      <Button
        label="Get Started →"
        onPress={() => onDone({ vehicleType: vehicle, placement })}
        disabled={!vehicle || !placement}
        style={{ marginTop: spacing.xl, width: '100%' }}
      />
    </View>
  );
}

export default function Onboarding() {
  const [page, setPage] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const goNext = () => {
    if (page < SLIDES.length) {
      const next = page + 1;
      setPage(next);
      flatRef.current?.scrollToIndex({ index: Math.min(next, SLIDES.length - 1), animated: true });
    }
  };

  const skip = () => router.replace('/auth/register');

  const handleSetupDone = async ({ vehicleType, placement }: SetupData) => {
    if (vehicleType) await SecureStore.setItemAsync('vehicle_type', vehicleType);
    if (placement) await SecureStore.setItemAsync('phone_placement', placement);
    router.replace('/auth/register');
  };

  const allItems = [...SLIDES.map((s) => ({ ...s, isSetup: false })), { key: 'setup', dot: 2, isSetup: true, content: null }];

  const renderItem: ListRenderItem<typeof allItems[0]> = ({ item }) => (
    <View style={{ width }}>
      {item.isSetup ? (
        <SetupSlide onDone={handleSetupDone} />
      ) : (
        item.content?.()
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={allItems}
        renderItem={renderItem}
        keyExtractor={(i) => i.key}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      />

      {page < SLIDES.length && (
        <View style={styles.footer}>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, page === i && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={skip}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
            <Button label="Next →" onPress={goNext} style={{ paddingHorizontal: spacing.xl }} />
          </View>
        </View>
      )}
    </View>
  );
}

const slide = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emoji: { fontSize: 72 },
  bigIcon: { fontSize: 36 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headline: { ...typography.h1, color: colors.textPrimary, textAlign: 'center', lineHeight: 36 },
  subtext: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, alignSelf: 'flex-start' },
  label: { ...typography.body, color: colors.textSecondary, alignSelf: 'flex-start' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'], gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { ...typography.body, color: colors.textMuted },
  vehicleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  vehicleBtn: {
    flex: 1, alignItems: 'center', padding: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border,
  },
  vehicleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
  vehicleIcon: { fontSize: 32 },
  vehicleLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    width: '100%', padding: spacing.sm, borderRadius: radius.card,
  },
  radioRowActive: { backgroundColor: colors.elevated },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
  },
  radioCircleFilled: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioLabel: { ...typography.body, color: colors.textPrimary },
});
