import { useEffect, useMemo, useRef } from 'react';
import {
  AppState,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  InteractionManager,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { TripStatusRing } from '@/components/trip-status-ring';
import { StatCard } from '@/components/stat-card';
import { NotificationBanner } from '@/components/notification-banner';
import { useAppStore } from '@/store/useAppStore';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import {
  formatDistanceValue,
  getUnitLabel,
  formatDistance,
  formatDuration,
  formatTripDate,
} from '@/utils/helpers';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const trips = useAppStore((s) => s.trips);
  const settings = useAppStore((s) => s.settings);
  const { isTracking, startTrip, stopTrip, starting, stopping } =
    useLocationTracking();

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

  const unit = settings.distanceUnit;

  // Import any background-detected trips into the store once the app has
  // fully rendered. We defer with InteractionManager so nothing touches the
  // native bridge during the first frame. This also runs whenever the app
  // returns to the foreground.
  const syncingRef = useRef(false);
  useEffect(() => {
    const runSync = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      InteractionManager.runAfterInteractions(() => {
        (async () => {
          try {
            const mod = await import('@/utils/background-tracking');
            await mod.syncPendingBackgroundTrips();
          } catch (err) {
            console.warn('[HomeScreen] background sync failed', err);
          } finally {
            syncingRef.current = false;
          }
        })();
      });
    };

    runSync();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') runSync();
    });
    return () => {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleStart = async () => {
    const ok = await startTrip();
    if (!ok) {
      const msg =
        'Location permission is required to track your trip. Please enable it in your device settings.';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert('Unable to start trip', msg);
      }
    }
  };

  const handleStop = async () => {
    await stopTrip();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 32,
        minHeight: '100%',
      }}
    >
      {/* Notification banner when tracking */}
      <NotificationBanner
        visible={isTracking}
        title="Trip in progress"
        message="MileageTrack is logging your journey while the app is open"
      />

      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: isTracking ? 12 : 0,
          marginBottom: 8,
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
            MileageTrack
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: isTracking
              ? `${Colors.accent}20`
              : `${Colors.surface}60`,
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
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 28,
        }}
      >
        <TripStatusRing />
      </View>

      {/* Start / Stop Trip button */}
      <Animated.View
        entering={FadeInUp.delay(150).duration(400)}
        style={{ marginBottom: 16 }}
      >
        {!isTracking ? (
          <Pressable
            onPress={handleStart}
            disabled={starting}
            style={({ pressed }) => ({
              backgroundColor: Colors.accent,
              borderRadius: 16,
              borderCurve: 'continuous',
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: pressed || starting ? 0.7 : 1,
              minHeight: 56,
            })}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 16,
                color: '#fff',
              }}
            >
              {starting ? 'Starting…' : 'Start Trip'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStop}
            disabled={stopping}
            style={({ pressed }) => ({
              backgroundColor: Colors.danger,
              borderRadius: 16,
              borderCurve: 'continuous',
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: pressed || stopping ? 0.7 : 1,
              minHeight: 56,
            })}
          >
            <Ionicons name="stop" size={20} color="#fff" />
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 16,
                color: '#fff',
              }}
            >
              {stopping ? 'Stopping…' : 'Stop Trip'}
            </Text>
          </Pressable>
        )}
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 12,
            color: Colors.textSecondary,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Keep the app open while driving to record your trip.
        </Text>
      </Animated.View>

      {/* Week stat (single compact line) */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(400)}
        style={{ alignItems: 'center', marginBottom: 16 }}
      >
        <Text
          selectable
          style={{
            fontFamily: Fonts.medium,
            fontSize: 15,
            color: Colors.textSecondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          This Week:{' '}
          <Text style={{ color: Colors.textPrimary, fontFamily: Fonts.semiBold }}>
            {formatDistanceValue(weekTotal, unit)} {getUnitLabel(unit)}
          </Text>
        </Text>
      </Animated.View>

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
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 15,
              color: Colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {lastTrip.startSuburb} → {lastTrip.endSuburb}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text
              selectable
              style={{
                fontFamily: Fonts.regular,
                fontSize: 13,
                color: Colors.textSecondary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDistance(lastTrip.distance, unit)}
            </Text>
            <Text
              selectable
              style={{
                fontFamily: Fonts.regular,
                fontSize: 13,
                color: Colors.textSecondary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDuration(lastTrip.duration)}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 13,
                color: Colors.textSecondary,
              }}
            >
              {formatTripDate(lastTrip.startTime)}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Week / Month stats */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
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
