import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { formatDistance, formatDuration, formatSpeed } from '@/utils/helpers';
import { useTranslation } from '@/i18n/useTranslation';

export function TripStatusRing() {
  const { t } = useTranslation();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const settings = useAppStore((s) => s.settings);
  const isActive = activeTrip.isTracking;

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const ringGlow = useSharedValue(0.4);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.08, { duration: 1600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      ringGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 400 });
      pulseOpacity.value = withTiming(0, { duration: 400 });
      ringGlow.value = withTiming(0.3, { duration: 400 });
    }
  }, [isActive, pulseScale, pulseOpacity, ringGlow]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const ringBorderStyle = useAnimatedStyle(() => ({
    opacity: ringGlow.value,
  }));

  const elapsed =
    isActive && activeTrip.startTime
      ? Math.round((Date.now() - new Date(activeTrip.startTime).getTime()) / 1000)
      : 0;

  const ringColor = isActive ? Colors.accent : Colors.surface;
  const statusColor = isActive ? Colors.accent : Colors.textSecondary;

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={{ alignItems: 'center', justifyContent: 'center', width: 260, height: 260 }}
    >
      {/* Outer pulsing glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: isActive ? Colors.accent : Colors.surface,
          },
          pulseStyle,
        ]}
      />

      {/* Ring border */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 224,
            height: 224,
            borderRadius: 112,
            borderWidth: 3,
            borderColor: ringColor,
          },
          ringBorderStyle,
        ]}
      />

      {/* Solid inner circle */}
      <View
        style={{
          width: 218,
          height: 218,
          borderRadius: 109,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isActive ? `${Colors.accent}18` : `${Colors.surface}30`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="car-outline" size={26} color={statusColor} />
          </View>

          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 13,
              color: statusColor,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {isActive ? t('ring.activeTrip') : t('ring.noActiveTrip')}
          </Text>

          {isActive ? (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text
                selectable
                style={{
                  fontFamily: Fonts.bold,
                  fontSize: 28,
                  color: Colors.textPrimary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatDistance(activeTrip.currentDistance, settings.distanceUnit)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    color: Colors.textSecondary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDuration(elapsed)}
                </Text>
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    color: Colors.textSecondary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatSpeed(activeTrip.currentSpeed, settings.distanceUnit)}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 13,
                color: Colors.textSecondary,
                textAlign: 'center',
                maxWidth: 150,
                marginTop: 2,
              }}
            >
              {t('ring.waiting')}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
