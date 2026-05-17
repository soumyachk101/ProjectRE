import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { ShimmerRow } from '../../components/ui/Shimmer';
import { LeaderboardEntry } from '../../types';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => api.users.stats(),
  });

  const { data: lbData, isLoading: lbLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.leaderboard.list(10),
  });

  const stats = statsData?.data;
  const leaderboard: LeaderboardEntry[] = (lbData?.data as LeaderboardEntry[]) ?? [];

  const handleLogout = async () => {
    await logout();
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>{user?.name ?? 'Rider'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Stats cards */}
      {statsLoading ? (
        <View style={styles.statsPad}>
          <ShimmerRow count={2} itemHeight={80} />
        </View>
      ) : stats ? (
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
          <LinearGradient colors={gradients.card as any} style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons name="road-variant" size={24} color={colors.accent} />
            <Text style={styles.statValue}>{stats.total_trips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </LinearGradient>
          <LinearGradient colors={gradients.card as any} style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{stats.total_events}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </LinearGradient>
          <LinearGradient colors={gradients.card as any} style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons name="map-marker-distance" size={24} color={colors.success} />
            <Text style={styles.statValue}>{stats.total_distance_km}</Text>
            <Text style={styles.statLabel}>km</Text>
          </LinearGradient>
          <LinearGradient colors={gradients.card as any} style={[styles.statCard, shadows.sm]}>
            <MaterialCommunityIcons name="trophy" size={24} color={colors.primary} />
            <Text style={styles.statValue}>#{stats.rank}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </LinearGradient>
        </Animated.View>
      ) : null}

      {/* Leaderboard */}
      <View style={styles.lbHeader}>
        <MaterialCommunityIcons name="podium" size={20} color={colors.primary} />
        <Text style={styles.lbTitle}>Leaderboard</Text>
      </View>

      {lbLoading ? (
        <View style={styles.lbPad}>
          <ShimmerRow count={5} itemHeight={56} gap={8} />
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => String(item.rank)}
          contentContainerStyle={styles.lbPad}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
              <View style={[styles.lbRow, shadows.sm]}>
                <View style={[styles.rankBadge, item.rank <= 3 && styles.rankBadgeTop]}>
                  <Text style={[styles.rankText, item.rank <= 3 && { color: colors.primary }]}>
                    {item.rank}
                  </Text>
                </View>
                <View style={styles.lbInfo}>
                  <Text style={styles.lbName}>{item.name}</Text>
                  <Text style={styles.lbMeta}>
                    {item.events_detected} events · {item.trips_completed} trips
                  </Text>
                </View>
                {item.rank <= 3 && (
                  <MaterialCommunityIcons
                    name={item.rank === 1 ? 'medal' : 'star'}
                    size={20}
                    color={item.rank === 1 ? '#f59e0b' : item.rank === 2 ? '#94a3b8' : '#cd7f32'}
                  />
                )}
              </View>
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
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: -4 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsPad: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { ...typography.h1, color: colors.textPrimary, fontSize: 22 },
  statLabel: { ...typography.caption, color: colors.textMuted },
  lbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  lbTitle: { ...typography.h2, color: colors.textPrimary },
  lbPad: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: {
    backgroundColor: colors.primaryGlow,
  },
  rankText: { ...typography.h3, color: colors.textMuted, fontSize: 14 },
  lbInfo: { flex: 1 },
  lbName: { ...typography.bodyMedium, color: colors.textPrimary },
  lbMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
