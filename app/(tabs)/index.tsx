import React, { useMemo } from 'react';
import { View, Text, Switch, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { TripStatusRing } from '@/components/trip-status-ring';
import { StatCard } from '@/components/stat-card';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatDistance, formatDuration, msToKmh } from '@/utils/geo';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { permissionStatus, isTracking, isStarting, startTracking, stopTracking, requestPermissions } =
    useLocationTracking();

  const activeTrip = useAppStore((s) => s.activeTrip);
  const trips = useAppStore((s) => s.trips);
  const currentSpeed = useAppStore((s) => s.currentSpeed);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const endTrip = useAppStore((s) => s.endTrip);
  const unit = settings.distanceUnit;

  const isTripActive = activeTrip !== null;

  // Weekly/monthly stats
  const { weekDistance, monthDistance } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let week = 0;
    let month = 0;
    for (const trip of trips) {
      if (trip.startTime >= startOfWeek.getTime()) week += trip.distance;
      if (trip.startTime >= startOfMonth.getTime()) month += trip.distance;
    }
    return { weekDistance: week, monthDistance: month };
  }, [trips]);

  const lastTrip = trips[0];

  const handleStartTrip = async () => {
    await startTracking();
  };

  const handleStopTrip = async () => {
    // End the active trip and stop location tracking
    endTrip('');
    await stopTracking();
  };

  const needsPermission = permissionStatus === 'undetermined' || permissionStatus === 'denied';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.appTitle}>MileageTrack</Text>
        <View style={[styles.trackingBadge, isTracking && styles.trackingActive]}>
          <View style={[styles.trackingDot, isTracking && styles.trackingDotActive]} />
          <Text style={[styles.trackingText, isTracking && styles.trackingTextActive]}>
            {isTracking ? 'Tracking' : 'Idle'}
          </Text>
        </View>
      </Animated.View>

      {/* Permission Banner */}
      {needsPermission && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Pressable style={styles.permissionBanner} onPress={requestPermissions}>
            <Ionicons name="location" size={20} color={colors.warning} />
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>Location Permission Required</Text>
              <Text style={styles.permissionSubtitle}>
                Tap to grant location access for trip tracking
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      )}

      {/* Status Ring */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.ringSection}>
        <TripStatusRing isActive={isTripActive} />

        {isTripActive ? (
          <View style={styles.liveStats}>
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>
                {formatDistance(activeTrip.distance, unit)}
              </Text>
              <Text style={styles.liveLabel}>{unit}</Text>
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>
                {formatDuration(Date.now() - activeTrip.startTime)}
              </Text>
              <Text style={styles.liveLabel}>duration</Text>
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveStat}>
              <Text style={styles.liveValue}>
                {Math.round(msToKmh(currentSpeed))}
              </Text>
              <Text style={styles.liveLabel}>km/h</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.waitingText}>
            {isTracking ? 'Waiting for movement...' : 'Tap Start Trip to begin'}
          </Text>
        )}
      </Animated.View>

      {/* Start / Stop Trip Button */}
      <Animated.View entering={FadeInDown.duration(400).delay(250)}>
        {!isTracking ? (
          <Pressable
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartTrip}
            disabled={isStarting}
          >
            <Ionicons name="play" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {isStarting ? 'Starting...' : 'Start Trip'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionButton, styles.stopButton]}
            onPress={handleStopTrip}
          >
            <Ionicons name="stop" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Stop Trip</Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Log All As Business Toggle */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
            <Text style={styles.toggleLabel}>Log all trips as Business</Text>
          </View>
          <Switch
            value={settings.logAllAsBusiness}
            onValueChange={(val) => updateSettings({ logAllAsBusiness: val })}
            trackColor={{ false: colors.surface, true: colors.primary + '60' }}
            thumbColor={settings.logAllAsBusiness ? colors.primary : colors.textMuted}
          />
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.statsRow}>
        <StatCard
          label="This Week"
          value={formatDistance(weekDistance, unit)}
          unit={unit}
          icon="trending-up"
          color={colors.primary}
        />
        <StatCard
          label="This Month"
          value={formatDistance(monthDistance, unit)}
          unit={unit}
          icon="bar-chart"
          color={colors.accent}
        />
      </Animated.View>

      {/* Last Trip Card */}
      {!isTripActive && lastTrip && (
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <View style={styles.lastTripCard}>
            <Text style={styles.lastTripTitle}>Last Trip</Text>
            <View style={styles.lastTripDetails}>
              <View style={styles.lastTripRoute}>
                <Text style={styles.lastTripSuburb}>{lastTrip.startSuburb || 'Unknown'}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                <Text style={styles.lastTripSuburb}>{lastTrip.endSuburb || 'Unknown'}</Text>
              </View>
              <View style={styles.lastTripStats}>
                <Text style={styles.lastTripStat}>
                  {formatDistance(lastTrip.distance, unit)} {unit}
                </Text>
                <Text style={styles.lastTripStat}>{formatDuration(lastTrip.duration)}</Text>
                <View style={[styles.miniPurposeBadge, { backgroundColor: lastTrip.purpose === 'Business' ? colors.primary + '20' : colors.warning + '20' }]}>
                  <Text style={[styles.miniPurposeText, { color: lastTrip.purpose === 'Business' ? colors.primary : colors.warning }]}>
                    {lastTrip.purpose}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderCurve: 'continuous',
  },
  trackingActive: {
    backgroundColor: colors.accent + '20',
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  trackingDotActive: {
    backgroundColor: colors.accent,
  },
  trackingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  trackingTextActive: {
    color: colors.accent,
  },
  permissionBanner: {
    backgroundColor: colors.warning + '15',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderCurve: 'continuous',
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    ...typography.callout,
    color: colors.warning,
    fontWeight: '600',
  },
  permissionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ringSection: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  liveStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  liveStat: {
    alignItems: 'center',
  },
  liveValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  liveLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderSubtle,
  },
  waitingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    minHeight: 56,
  },
  startButton: {
    backgroundColor: colors.accent,
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderCurve: 'continuous',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  lastTripCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderCurve: 'continuous',
  },
  lastTripTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastTripDetails: {
    gap: spacing.sm,
  },
  lastTripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lastTripSuburb: {
    ...typography.body,
    color: colors.textPrimary,
  },
  lastTripStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lastTripStat: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  miniPurposeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  miniPurposeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
