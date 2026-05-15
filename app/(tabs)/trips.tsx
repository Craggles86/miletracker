import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { TripCard } from '@/components/trip-card';
import { PurposeFilter } from '@/components/purpose-filter';
import { Trip, TripPurpose } from '@/store/types';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatDistance } from '@/utils/geo';

type FilterOption = 'All' | TripPurpose;

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const trips = useAppStore((s) => s.trips);
  const deleteTrip = useAppStore((s) => s.deleteTrip);
  const unit = useAppStore((s) => s.settings.distanceUnit);
  const [filter, setFilter] = useState<FilterOption>('All');

  const filteredTrips = useMemo(() => {
    if (filter === 'All') return trips;
    return trips.filter((t) => t.purpose === filter);
  }, [trips, filter]);

  const totalDistance = useMemo(() => {
    return filteredTrips.reduce((sum, t) => sum + t.distance, 0);
  }, [filteredTrips]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(id) },
      ]);
    },
    [deleteTrip]
  );

  const renderRightActions = useCallback(
    (id: string) => (
      <View style={styles.deleteAction}>
        <Ionicons name="trash" size={22} color="#FFFFFF" />
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Trip; index: number }) => (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
        <Swipeable
          renderRightActions={() => renderRightActions(item.id)}
          onSwipeableOpen={() => handleDelete(item.id)}
          overshootRight={false}
        >
          <TripCard trip={item} onPress={() => router.push(`/trip/${item.id}`)} />
        </Swipeable>
      </Animated.View>
    ),
    [router, handleDelete, renderRightActions]
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.headerSection}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Mileage</Text>
          <View style={styles.summaryValueRow}>
            <Text style={styles.summaryValue}>{formatDistance(totalDistance, unit)}</Text>
            <Text style={styles.summaryUnit}>{unit}</Text>
          </View>
          <Text style={styles.summaryCount}>
            {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    ),
    [totalDistance, unit, filteredTrips.length]
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="car-sport-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No trips yet</Text>
        <Text style={styles.emptySubtitle}>
          Your trips will appear here once MileageTrack detects movement
        </Text>
      </View>
    ),
    []
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.titleRow}>
        <Text style={styles.title}>Trips</Text>
      </Animated.View>

      <PurposeFilter selected={filter} onSelect={setFilter} />

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  titleRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xs,
    borderCurve: 'continuous',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  summaryUnit: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryCount: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  deleteAction: {
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginLeft: spacing.sm,
    borderCurve: 'continuous',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
