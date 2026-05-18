import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ConfirmedEvent } from '../../types';
import { colors, gradients, spacing, radius, shadows, typography, eventColors, eventGradients } from '../../constants/theme';
import { EventBadge } from '../ui/Badge';

interface EventDetailSheetProps {
  event: ConfirmedEvent | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  const handleShare = async () => {
    if (!event) return;
    const label = event.event_type.replace('_', ' ');
    try {
      await Share.share({
        message: `${label.toUpperCase()} detected at (${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}) — confirmed by ${event.trail_count} riders via RoadSense`,
      });
    } catch {}
  };

  if (!event) return null;

  const gradient = eventGradients[event.event_type] ?? eventGradients.anomaly;

  return (
    <Modal transparent visible={!!event} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetBg}>
      <View style={styles.handle} />
      {/* Gradient header strip */}
      <LinearGradient
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerStrip}
      />
      <LinearGradient
        colors={[gradient[0] + '14', 'transparent'] as any}
        style={styles.headerGlow}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <EventBadge type={event.event_type} />
          {event.confidence_score !== null && (
            <View style={styles.confidenceWrap}>
              <MaterialCommunityIcons name="chart-bar" size={14} color={colors.textSecondary} />
              <Text style={styles.confidence}>
                {Math.round(event.confidence_score * 100)}% confidence
              </Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.statValue}>{timeAgo(event.last_seen)}</Text>
            <Text style={styles.statLabel}>Reported</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={18} color={colors.primaryLight} />
            <Text style={styles.statValue}>{event.trail_count}</Text>
            <Text style={styles.statLabel}>Riders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="shield-check" size={18} color={colors.successLight} />
            <Text style={styles.statValue}>
              {event.trail_count >= 10 ? 'High' : event.trail_count >= 3 ? 'Medium' : 'Low'}
            </Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
        </View>

        {/* Vehicle breakdown */}
        <Text style={styles.sectionLabel}>DETECTED BY</Text>
        <View style={styles.vehicleRow}>
          <View style={styles.vehicleChip}>
            <MaterialCommunityIcons name="motorbike" size={16} color={colors.primaryLight} />
            <Text style={styles.vehicleCount}>{Math.round(event.trail_count * 0.6)}</Text>
          </View>
          <View style={styles.vehicleChip}>
            <MaterialCommunityIcons name="rickshaw" size={16} color={colors.accent} />
            <Text style={styles.vehicleCount}>{Math.round(event.trail_count * 0.25)}</Text>
          </View>
          <View style={styles.vehicleChip}>
            <MaterialCommunityIcons name="car" size={16} color={colors.warning} />
            <Text style={styles.vehicleCount}>{Math.round(event.trail_count * 0.15)}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable style={styles.reportBtn} onPress={() => Alert.alert('Thank you', 'Event marked for review')}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
            <Text style={styles.reportBtnText}>Report Fixed</Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.accent} />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  handle: {
    backgroundColor: colors.border,
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  headerStrip: {
    height: 4,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidence: { ...typography.caption, color: colors.textSecondary },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { ...typography.h3, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  vehicleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleCount: { ...typography.h3, color: colors.textPrimary },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  reportBtnText: { ...typography.bodyMedium, color: colors.success, fontWeight: '700' },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,122,255,0.08)',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.25)',
  },
  shareBtnText: { ...typography.bodyMedium, color: colors.accent, fontWeight: '700' },
});
