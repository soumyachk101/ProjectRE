import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { ConfirmedEvent } from '../../types';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { EventBadge, SeverityBadge } from '../ui/Badge';

const VEHICLE_ICONS = { two_wheeler: '🏍️', three_wheeler: '🛺', four_wheeler: '🚗' };

interface EventDetailSheetProps {
  event: ConfirmedEvent | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = ['40%'];

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  if (!event) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.row}>
          <EventBadge type={event.event_type} />
          {event.confidence_score !== null && (
            <Text style={styles.confidence}>
              📊 {Math.round(event.confidence_score * 100)}% confidence
            </Text>
          )}
        </View>

        <Text style={styles.meta}>🕐 Reported {timeAgo(event.last_seen)}</Text>
        <Text style={styles.meta}>👥 {event.trail_count} riders confirmed</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>DETECTED BY</Text>
        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleChip}>🏍️ {Math.round(event.trail_count * 0.6)}</Text>
          <Text style={styles.vehicleChip}>🛺 {Math.round(event.trail_count * 0.25)}</Text>
          <Text style={styles.vehicleChip}>🚗 {Math.round(event.trail_count * 0.15)}</Text>
        </View>

        <TouchableOpacity style={styles.reportBtn}>
          <Text style={styles.reportBtnText}>Report Fixed</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.surface },
  handle: { backgroundColor: colors.border },
  content: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confidence: { ...typography.caption, color: colors.textSecondary },
  meta: { ...typography.body, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  vehicleRow: { flexDirection: 'row', gap: spacing.md },
  vehicleChip: { ...typography.body, color: colors.textPrimary },
  reportBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.elevated,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportBtnText: { ...typography.body, color: colors.textSecondary },
});
