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

  const initial = (user?.name ?? 'R').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.aurora as any} style={StyleSheet.absoluteFill} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => String(item.rank)}
          contentContainerStyle={styles.lbPad}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Hero header card */}
              <Animated.View entering={FadeInDown.duration(450)}>
                <LinearGradient
                  colors={gradients.primaryBright as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.hero, shadows.lg]}
                >
                  <View style={styles.heroTopRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
                      <MaterialCommunityIcons name="logout" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.heroEyebrow}>ROADSENSE MEMBER</Text>
                  <Text style={styles.heroName}>{user?.name ?? 'Rider'}</Text>
                  {stats && (
                    <View style={styles.heroRankPill}>
                      <MaterialCommunityIcons name="trophy-outline" size={14} color="#fde68a" />
                      <Text style={styles.heroRankText}>Ranked #{stats.rank} globally</Text>
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>

              {/* Stats grid */}
              {statsLoading ? (
                <View style={styles.statsPad}>
                  <ShimmerRow count={2} itemHeight={88} />
                </View>
              ) : stats ? (
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
                  <StatTile icon="road-variant" color={colors.accent} value={String(stats.total_trips)} label="Trips" />
                  <StatTile icon="alert-circle" color={colors.warning} value={String(stats.total_events)} label="Events" />
                  <StatTile icon="map-marker-distance" color={colors.success} value={String(stats.total_distance_km)} label="km" />
                </Animated.View>
              ) : null}

              {/* Leaderboard section title */}
              <View style={styles.lbHeader}>
                <View style={styles.lbHeaderLeft}>
                  <MaterialCommunityIcons name="podium" size={18} color={colors.accent} />
                  <Text style={styles.lbTitle}>Leaderboard</Text>
                </View>
                <Text style={styles.lbHeaderHint}>Top riders</Text>
              </View>

              {lbLoading && (
                <ShimmerRow count={5} itemHeight={64} gap={10} />
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
              <View style={[styles.lbRow, shadows.sm]}>
                <RankBadge rank={item.rank} />
                <View style={styles.lbInfo}>
                  <Text style={styles.lbName}>{item.name}</Text>
                  <Text style={styles.lbMeta}>
                    {item.events_detected} events · {item.trips_completed} trips
                  </Text>
                </View>
                {item.rank <= 3 && (
                  <MaterialCommunityIcons
                    name={item.rank === 1 ? 'medal' : 'star-four-points'}
                    size={20}
                    color={item.rank === 1 ? '#f59e0b' : item.rank === 2 ? '#94a3b8' : '#cd7f32'}
                  />
                )}
              </View>
            </Animated.View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

function StatTile({ icon, color, value, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; value: string; label: string }) {
  return (
    <LinearGradient colors={gradients.card as any} style={[styles.statCard, shadows.sm]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '14' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <LinearGradient colors={gradients.gold as any} style={styles.rankBadge}>
        <Text style={[styles.rankText, { color: '#fff' }]}>{rank}</Text>
      </LinearGradient>
    );
  }
  if (rank === 2) {
    return (
      <LinearGradient colors={gradients.silver as any} style={styles.rankBadge}>
        <Text style={[styles.rankText, { color: '#fff' }]}>{rank}</Text>
      </LinearGradient>
    );
  }
  if (rank === 3) {
    return (
      <LinearGradient colors={gradients.bronze as any} style={styles.rankBadge}>
        <Text style={[styles.rankText, { color: '#fff' }]}>{rank}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  orbOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(47,72,88,0.06)',
    top: -80,
    right: -100,
  },
  orbTwo: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(47,72,88,0.08)',
    bottom: 40,
    left: -160,
  },
  hero: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.modal,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarText: { ...typography.h1, color: '#fff', fontSize: 24 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroEyebrow: { ...typography.label, color: 'rgba(255,255,255,0.68)' },
  heroName: { ...typography.display, color: '#fff', marginTop: 4 },
  heroRankPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroRankText: { ...typography.caption, color: '#fff', fontWeight: '600' },
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
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: colors.glass,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { ...typography.h1, color: colors.textPrimary, fontSize: 22, letterSpacing: -0.6 },
  statLabel: { ...typography.caption, color: colors.textMuted },
  lbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  lbHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lbTitle: { ...typography.h2, color: colors.textPrimary },
  lbHeaderHint: { ...typography.caption, color: colors.textMuted },
  lbPad: { paddingHorizontal: spacing.lg, paddingBottom: 110 },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankText: { ...typography.h3, color: colors.textMuted, fontSize: 14 },
  lbInfo: { flex: 1 },
  lbName: { ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '600' },
  lbMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
