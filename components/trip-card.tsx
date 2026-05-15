import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@/store/types';
import { useAppStore } from '@/store/app-store';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import { formatDate, formatTime } from '@/utils/time';

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const unit = useAppStore((s) => s.settings.distanceUnit);

  const isBusiness = trip.purpose === 'Business';
  const badgeColor = isBusiness ? colors.primary : colors.warning;
  const badgeBg = isBusiness ? colors.primary + '20' : colors.warning + '20';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.date}>{formatDate(trip.startTime)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{trip.purpose}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text style={styles.suburb} numberOfLines={1}>
            {trip.startSuburb || 'Unknown'}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.suburb} numberOfLines={1}>
            {trip.endSuburb || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="speedometer-outline" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>
            {formatDistance(trip.distance, unit)} {unit}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>{formatDuration(trip.duration)}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>{formatTime(trip.startTime)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    flex: 0.3,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  suburb: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.callout,
    color: colors.textMuted,
  },
});
