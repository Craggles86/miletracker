import { useEffect, useMemo, useRef } from 'react';
import {
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
  formatTripDateLocale,
} from '@/utils/helpers';
import { useTranslation } from '@/i18n/useTranslation';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
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

  // After the app has rendered and the user is on the home screen, bring the
  // background trip-detection foreground service up IF the user previously
  // enabled it AND permissions are still granted. This is deferred with
  // InteractionManager so nothing touches the native bridge during the first
  // frame — that was the startup crash we're working around.
  const bootstrapRef = useRef(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;

    const handle = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const mod = await import('@/utils/background-tracking');
          if (mod.isBackgroundTrackingActive()) return;

          const wasEnabled = await mod.wasBackgroundTrackingEnabled();
          if (!wasEnabled) return;

          const perms = await mod.checkBackgroundPermissions();
          if (perms.foreground !== 'granted' || perms.background !== 'granted') {
            // User revoked permissions — don't auto-restart silently.
            return;
          }
          await mod.enableBackgroundTracking();
        } catch (err) {
          console.warn('[HomeScreen] background bootstrap failed', err);
        }
      })();
    });

    return () => {
      try {
        handle.cancel?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleStart = async () => {
    const ok = await startTrip();
    if (!ok) {
      const msg = t('home.unableToStartMessage');
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert(t('home.unableToStartTitle'), msg);
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
        title={t('home.bannerTripTitle')}
        message={t('home.bannerTripMessage')}
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
            {t('home.appName')}
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
            {isTracking ? t('home.statusTracking') : t('home.statusIdle')}
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
              {starting ? t('home.starting') : t('home.startTrip')}
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
              {stopping ? t('home.stopping') : t('home.stopTrip')}
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
          {t('home.keepAppOpen')}
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
          {t('home.thisWeek')}:{' '}
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
            {t('home.lastTrip')}
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
              {formatTripDateLocale(lastTrip.startTime, locale)}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Week / Month stats */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <StatCard
          label={t('home.thisWeek')}
          value={formatDistanceValue(weekTotal, unit)}
          unit={getUnitLabel(unit)}
          index={0}
        />
        <StatCard
          label={t('home.thisMonth')}
          value={formatDistanceValue(monthTotal, unit)}
          unit={getUnitLabel(unit)}
          index={1}
        />
      </View>

    </ScrollView>
  );
}
