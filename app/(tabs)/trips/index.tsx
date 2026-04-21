import { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { TripCard } from '@/components/trip-card';
import { PurposeFilter, type FilterOption } from '@/components/purpose-filter';
import { formatDistanceValue, getUnitLabel } from '@/utils/helpers';
import { useTranslation } from '@/i18n/useTranslation';

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const trips = useAppStore((s) => s.trips);
  const deleteTrip = useAppStore((s) => s.deleteTrip);
  const settings = useAppStore((s) => s.settings);
  const [filter, setFilter] = useState<FilterOption>('All');

  const unit = settings.distanceUnit;

  const filteredTrips = useMemo(() => {
    if (filter === 'All') return trips;
    return trips.filter((t) => t.purpose === filter);
  }, [trips, filter]);

  const totalDistance = useMemo(
    () => trips.reduce((acc, t) => acc + t.distance, 0),
    [trips]
  );

  const handleDelete = useCallback(
    (id: string) => deleteTrip(id),
    [deleteTrip]
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 32,
        }}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 26,
              color: Colors.textPrimary,
              textAlign: 'center',
            }}
          >
            {t('trips.title')}
          </Text>
        </Animated.View>

        {/* Total mileage card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={{
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.border,
            alignItems: 'center',
            marginBottom: 16,
            gap: 4,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 12,
              color: Colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {t('trips.totalMileage')}
          </Text>
          <Text
            selectable
            style={{
              fontFamily: Fonts.bold,
              fontSize: 32,
              color: Colors.textPrimary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatDistanceValue(totalDistance, unit)} {getUnitLabel(unit)}
          </Text>
        </Animated.View>

        {/* Filter */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={{ marginBottom: 16 }}
        >
          <PurposeFilter selected={filter} onChange={setFilter} />
        </Animated.View>

        {/* Trip list */}
        {filteredTrips.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 28 }}>🚗</Text>
            </View>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 17,
                color: Colors.textPrimary,
              }}
            >
              {t('trips.emptyTitle')}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: 'center',
                maxWidth: 260,
              }}
            >
              {t('trips.emptyMessage')}
            </Text>
          </Animated.View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredTrips.map((trip, index) => (
              <TripCard
                key={trip.id}
                trip={trip}
                unit={unit}
                index={index}
                onPress={() => router.push(`/trips/${trip.id}`)}
                onDelete={() => handleDelete(trip.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
