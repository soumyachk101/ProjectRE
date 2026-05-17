import React from 'react';
import { View, Text, StyleSheet, FlatList, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Trip } from '../../types';
import { colors, spacing, typography } from '../../constants/theme';
import { TripCard } from '../../components/trip/TripCard';

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
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
      </View>

      {totalEvents > 0 && (
        <View style={styles.contributionBanner}>
          <Text style={styles.contributionText}>
            You've helped map {totalEvents} road events! 🎉
          </Text>
        </View>
      )}

      {isLoading ? (
        <Text style={styles.loading}>Loading trips...</Text>
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySub}>Start a trip to begin mapping road events</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <TripCard trip={item} />
            </View>
          )}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingBottom: 0 },
  title: { ...typography.h1, color: colors.textPrimary },
  contributionBanner: {
    margin: spacing.md, backgroundColor: colors.primary + '22',
    borderRadius: 8, padding: spacing.md, borderWidth: 1, borderColor: colors.primary,
  },
  contributionText: { ...typography.body, color: colors.primaryLight, textAlign: 'center' },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  sectionHeader: { ...typography.h3, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  cardWrap: { marginBottom: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { ...typography.h2, color: colors.textPrimary },
  emptySub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
