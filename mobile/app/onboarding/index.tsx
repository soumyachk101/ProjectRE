import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

const { width } = Dimensions.get('window');

type VehicleType = 'two_wheeler' | 'three_wheeler' | 'four_wheeler';
type PlacementType = 'mounter' | 'pocket' | 'dashboard';

const SLIDES = [
  {
    key: 'hook',
    dot: 0,
    icon: 'road-variant' as const,
    headline: "India's roads are mapped by satellites.",
    subline: "But potholes aren't.",
    accent: 'Until now.',
    gradient: gradients.primaryBright,
  },
  {
    key: 'how',
    dot: 1,
    icon: 'cellphone-arrow-down' as const,
    headline: 'Just ride.',
    subline: 'RoadSense detects. The map updates.',
    accent: 'No tapping. No tagging. Fully automatic.',
    gradient: gradients.accent,
  },
];

function SlideItem({ item }: { item: typeof SLIDES[0] }) {
  return (
    <View style={slide.container}>
      <Animated.View entering={FadeInDown.duration(520)} style={slide.heroCard}>
        <LinearGradient
          colors={item.gradient as any}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={slide.iconCircle}
        >
          <MaterialCommunityIcons name={item.icon} size={56} color="#fff" />
        </LinearGradient>
        <Text style={slide.eyebrow}>ROADSENSE AI</Text>
        <Text style={slide.headline}>{item.headline}</Text>
        <Text style={slide.subline}>{item.subline}</Text>
        <Text style={slide.accent}>{item.accent}</Text>
      </Animated.View>
    </View>
  );
}

const slide = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  heroCard: {
    width: '100%',
    alignItems: 'center',
    borderRadius: radius.modal,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: spacing.xl,
    ...shadows.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
  },
  subline: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  accent: {
    ...typography.h3,
    color: colors.primary,
    textAlign: 'center',
  },
});

interface SetupData {
  vehicleType: VehicleType | null;
  placement: PlacementType | null;
}

function SetupSlide({ onDone }: { onDone: (d: SetupData) => void }) {
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [placement, setPlacement] = useState<PlacementType | null>(null);

  const vehicles: { key: VehicleType; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }[] = [
    { key: 'two_wheeler', icon: 'motorbike', label: '2 Wheeler' },
    { key: 'three_wheeler', icon: 'rickshaw', label: '3 Wheeler' },
    { key: 'four_wheeler', icon: 'car', label: '4 Wheeler' },
  ];

  const placements: { key: PlacementType; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }[] = [
    { key: 'mounter', icon: 'cellphone-screenshot', label: 'Mounted' },
    { key: 'pocket', icon: 'pocket', label: 'Pocket' },
    { key: 'dashboard', icon: 'car-info', label: 'Dashboard' },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(520)} style={setupStyles.container}>
      <Text style={setupStyles.eyebrow}>PERSONALIZE DETECTION</Text>
      <Text style={setupStyles.title}>Setup</Text>
      <Text style={setupStyles.subtitle}>RoadSense tunes detection to your ride and phone position.</Text>

      <Text style={setupStyles.sectionLabel}>VEHICLE TYPE</Text>
      <View style={setupStyles.optionRow}>
        {vehicles.map((v) => (
          <TouchableOpacity
            key={v.key}
            style={[setupStyles.option, vehicle === v.key && setupStyles.optionActive]}
            onPress={() => setVehicle(v.key)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={v.icon}
              size={28}
              color={vehicle === v.key ? colors.primary : colors.textMuted}
            />
            <Text style={[setupStyles.optionLabel, vehicle === v.key && { color: colors.primary }]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={setupStyles.sectionLabel}>PHONE PLACEMENT</Text>
      <View style={setupStyles.optionRow}>
        {placements.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[setupStyles.option, placement === p.key && setupStyles.optionActive]}
            onPress={() => setPlacement(p.key)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={p.icon}
              size={28}
              color={placement === p.key ? colors.primary : colors.textMuted}
            />
            <Text style={[setupStyles.optionLabel, placement === p.key && { color: colors.primary }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={setupStyles.btnWrap}>
        <Button
          label="Get Started"
          onPress={() => onDone({ vehicleType: vehicle, placement })}
          disabled={!vehicle || !placement}
        />
      </View>
    </Animated.View>
  );
}

const setupStyles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  title: { ...typography.display, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.glass,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.82)',
    ...shadows.sm,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  optionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  btnWrap: { marginTop: spacing.lg },
});

export default function Onboarding() {
  const flatListRef = useRef<FlatList>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const handleSetupDone = async (data: SetupData) => {
    if (data.vehicleType) await SecureStore.setItemAsync('vehicleType', data.vehicleType);
    if (data.placement) await SecureStore.setItemAsync('placement', data.placement);
    await SecureStore.setItemAsync('onboardingDone', 'true');
    router.replace('/auth/register');
  };

  const totalSlides = SLIDES.length + 1; // +1 for setup

  return (
    <LinearGradient colors={gradients.aurora as any} style={styles.container}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <FlatList
        ref={flatListRef}
        data={[...SLIDES, { key: 'setup' } as any]}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={slideIndex < SLIDES.length} // disable scroll on setup
        onViewableItemsChanged={({ viewableItems }) => {
          const idx = viewableItems[0]?.index;
          if (idx != null) setSlideIndex(idx);
        }}
        renderItem={({ item, index }) => {
          if (index < SLIDES.length) return <SlideItem item={item} />;
          return <SetupSlide onDone={handleSetupDone} />;
        }}
      />

      {/* Dots + skip */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: totalSlides }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === slideIndex && styles.dotActive]}
            />
          ))}
        </View>
        {slideIndex < SLIDES.length && (
          <TouchableOpacity onPress={() => router.replace('/auth/register')}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  orbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(90,200,250,0.18)',
    top: 90,
    right: -80,
  },
  orbTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0,122,255,0.10)',
    bottom: 90,
    left: -120,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: 50,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  skip: { ...typography.bodyMedium, color: colors.textMuted },
});
