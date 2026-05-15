import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import { formatDate, formatTime } from '@/utils/time';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const trips = useAppStore((s) => s.trips);
  const unit = useAppStore((s) => s.settings.distanceUnit);

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  if (!trip) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Trip not found</Text>
      </View>
    );
  }

  const isBusiness = trip.purpose === 'Business';
  const badgeColor = isBusiness ? colors.primary : colors.warning;
  const badgeBg = isBusiness ? colors.primary + '20' : colors.warning + '20';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Trip Summary Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.summaryHeader}>
        <View style={styles.summaryIconRow}>
          <View style={[styles.summaryIconCircle, { backgroundColor: badgeBg }]}>
            <Ionicons
              name={isBusiness ? 'briefcase' : 'car-sport'}
              size={28}
              color={badgeColor}
            />
          </View>
        </View>
        <View style={styles.summaryRoute}>
          <Text style={styles.summaryFrom}>{trip.startSuburb || 'Unknown'}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
          <Text style={styles.summaryTo}>{trip.endSuburb || 'Unknown'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{trip.purpose}</Text>
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {/* Date & Time */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.dateCard}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text selectable style={styles.dateText}>{formatDate(trip.startTime)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text selectable style={styles.dateText}>
              {formatTime(trip.startTime)} – {formatTime(trip.endTime)}
            </Text>
          </View>
        </Animated.View>

        {/* Route */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeTimeline}>
              <View style={[styles.routeDot, { backgroundColor: colors.accent }]} />
              <View style={styles.routeConnector} />
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.routeLabels}>
              <View style={styles.routeLabel}>
                <Text selectable style={styles.routeSuburb}>{trip.startSuburb || 'Unknown'}</Text>
                <Text selectable style={styles.routeTime}>{formatTime(trip.startTime)}</Text>
              </View>
              <View style={styles.routeLabel}>
                <Text selectable style={styles.routeSuburb}>{trip.endSuburb || 'Unknown'}</Text>
                <Text selectable style={styles.routeTime}>{formatTime(trip.endTime)}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="speedometer" size={18} color={colors.primary} />
            </View>
            <Text selectable style={styles.statValue}>
              {formatDistance(trip.distance, unit)} {unit}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="time" size={18} color={colors.accent} />
            </View>
            <Text selectable style={styles.statValue}>{formatDuration(trip.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="navigate" size={18} color={colors.warning} />
            </View>
            <Text selectable style={styles.statValue}>{trip.routePoints.length}</Text>
            <Text style={styles.statLabel}>GPS Points</Text>
          </View>

          {trip.scalingFactor !== 1 && (
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="resize" size={18} color={colors.danger} />
              </View>
              <Text selectable style={styles.statValue}>{trip.scalingFactor.toFixed(2)}x</Text>
              <Text style={styles.statLabel}>Calibration</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryHeader: {
    backgroundColor: colors.card,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIconRow: {
    marginBottom: spacing.sm,
  },
  summaryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryFrom: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  summaryTo: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  dateCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderCurve: 'continuous',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  routeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderCurve: 'continuous',
  },
  routeRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  routeTimeline: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 4,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  routeLabel: {
    gap: 2,
  },
  routeSuburb: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  routeTime: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: '30%',
    flex: 1,
    borderCurve: 'continuous',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.headline,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
