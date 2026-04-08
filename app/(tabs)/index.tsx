import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { TripStatusRing } from '@/components/trip-status-ring';
import { StatCard } from '@/components/stat-card';
import { useAppStore } from '@/store/useAppStore';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { formatDistanceValue, getUnitLabel, formatDistance, formatDuration, formatTripDate } from '@/utils/helpers';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const trips = useAppStore((s) => s.trips);
  const preferences = useAppStore((s) => s.preferences);
  const { isTracking } = useLocationTracking();

  const { weekTotal, monthTotal, lastTrip } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let week = 0;
    let month = 0;

    for (const trip of trips) {
      const tripDate = new Date(trip.startTime);
      if (tripDate >= startOfWeek) week += trip.distance;
      if (tripDate >= startOfMonth) month += trip.distance;
    }

    return {
      weekTotal: week,
      monthTotal: month,
      lastTrip: trips.length > 0 ? trips[0] : null,
    };
  }, [trips]);

  const unit = preferences.distanceUnit;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 32,
        minHeight: '100%',
      }}
    >
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              borderCurve: 'continuous',
              backgroundColor: `${Colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="speedometer" size={18} color={Colors.primary} />
          </View>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 22,
              color: Colors.textPrimary,
            }}
          >
            MileTrack
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: isTracking ? `${Colors.accent}20` : `${Colors.surface}60`,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
            borderCurve: 'continuous',
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: isTracking ? Colors.accent : Colors.textSecondary,
            }}
          />
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 12,
              color: isTracking ? Colors.accent : Colors.textSecondary,
            }}
          >
            {isTracking ? 'Tracking' : 'Idle'}
          </Text>
        </View>
      </Animated.View>

      {/* Main ring */}
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
        <TripStatusRing />
      </View>

      {/* Last trip summary (when not tracking) */}
      {!isTracking && lastTrip && (
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={{
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 11,
              color: Colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Last Trip
          </Text>
          <Text
            selectable
            style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textPrimary, marginBottom: 4 }}
          >
            {lastTrip.startLocation && lastTrip.endLocation
              ? `${lastTrip.startLocation} → ${lastTrip.endLocation}`
              : 'Recent Trip'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text
              selectable
              style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, fontVariant: ['tabular-nums'] }}
            >
              {formatDistance(lastTrip.distance, unit)}
            </Text>
            <Text
              selectable
              style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, fontVariant: ['tabular-nums'] }}
            >
              {formatDuration(lastTrip.duration)}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
              {formatTripDate(lastTrip.startTime)}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Week / Month stats */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard
          label="This Week"
          value={formatDistanceValue(weekTotal, unit)}
          unit={getUnitLabel(unit)}
          index={0}
        />
        <StatCard
          label="This Month"
          value={formatDistanceValue(monthTotal, unit)}
          unit={getUnitLabel(unit)}
          index={1}
        />
      </View>
    </ScrollView>
  );
}
