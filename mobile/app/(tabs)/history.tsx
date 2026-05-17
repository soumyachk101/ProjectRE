import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Trip } from '../../types';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { TripCard } from '../../components/trip/TripCard';
import { ShimmerRow } from '../../components/ui/Shimmer';

function groupTripsByDate(trips: Trip[]) {
  const map: Record<string, Trip[]> = {};
  trips.forEach((t) => {
    const d = t.started_at ? new Date(t.started_at) : new Date(t.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (!map[label]) map[label] = [];
    map[label].push(t);
  });
  return Object.entries(map).map(([title, data]) => ({ title, data }));
}

export default function HistoryScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.trips.list(),
  });

  const trips: Trip[] = (data?.data as Trip[]) ?? [];
  const sections = groupTripsByDate(trips);
  const totalEvents = trips.reduce((a, t) => a + (t.event_count ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <MaterialCommunityIcons name="history" size={24} color={colors.textMuted} />
      </View>

      {/* Contribution banner */}
      {totalEvents > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <LinearGradient
            colors={gradients.primaryBright as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.banner, shadows.md]}
          >
            <MaterialCommunityIcons name="shield-star" size={28} color="rgba(255,255,255,0.9)" />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>{totalEvents} events mapped</Text>
              <Text style={styles.bannerSub}>Keep riding to improve road safety</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.listPad}>
          <ShimmerRow count={4} itemHeight={80} />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <LinearGradient
            colors={gradients.card as any}
            style={styles.emptyCard}
          >
            <MaterialCommunityIcons name="map-search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySub}>Start your first trip to begin mapping roads</Text>
          </LinearGradient>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.title}
          contentContainerStyle={styles.listPad}
          renderItem={({ item: section, index: si }) => (
            <Animated.View entering={FadeInDown.delay(si * 80).duration(300)}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((trip, ti) => (
                <Animated.View key={trip.id} entering={FadeInDown.delay(si * 80 + ti * 40).duration(300)}>
                  <TripCard trip={trip} />
                </Animated.View>
              ))}
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.display, color: colors.textPrimary },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  bannerText: { flex: 1 },
  bannerTitle: { ...typography.h3, color: '#fff' },
  bannerSub: { ...typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  listPad: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    width: '100%',
  },
  emptyTitle: { ...typography.h2, color: colors.textPrimary },
  emptySub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
