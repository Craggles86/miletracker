import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import { formatDate, formatTime } from '@/utils/time';
import { RouteMapPreview } from '@/components/route-map-preview';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
      {/* Map Preview */}
      <Animated.View entering={FadeIn.duration(400)}>
        <RouteMapPreview
          routePoints={trip.routePoints}
          width={width}
          height={240}
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {/* Date & Purpose */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.headerRow}>
          <Text style={styles.date}>{formatDate(trip.startTime)}</Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{trip.purpose}</Text>
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
                <Text style={styles.routeSuburb}>{trip.startSuburb || 'Unknown'}</Text>
                <Text style={styles.routeTime}>{formatTime(trip.startTime)}</Text>
              </View>
              <View style={styles.routeLabel}>
                <Text style={styles.routeSuburb}>{trip.endSuburb || 'Unknown'}</Text>
                <Text style={styles.routeTime}>{formatTime(trip.endTime)}</Text>
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
            <Text style={styles.statValue}>
              {formatDistance(trip.distance, unit)} {unit}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="time" size={18} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>{formatDuration(trip.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="navigate" size={18} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{trip.routePoints.length}</Text>
            <Text style={styles.statLabel}>GPS Points</Text>
          </View>

          {trip.scalingFactor !== 1 && (
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="resize" size={18} color={colors.danger} />
              </View>
              <Text style={styles.statValue}>{trip.scalingFactor.toFixed(2)}x</Text>
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
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
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
