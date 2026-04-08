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

export function TripStatusRing() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const preferences = useAppStore((s) => s.preferences);
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

  const elapsed = isActive && activeTrip.startTime
    ? Math.round((Date.now() - new Date(activeTrip.startTime).getTime()) / 1000)
    : 0;

  const ringColor = isActive ? Colors.accent : Colors.surface;
  const statusColor = isActive ? Colors.accent : Colors.textSecondary;

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={{ alignItems: 'center', justifyContent: 'center', width: 240, height: 240 }}
    >
      {/* Outer pulsing glow (only when active) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: 120,
            backgroundColor: isActive ? Colors.accent : Colors.surface,
          },
          pulseStyle,
        ]}
      />

      {/* Ring border (separate animated opacity for glow effect) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 206,
            height: 206,
            borderRadius: 103,
            borderWidth: 3,
            borderColor: ringColor,
          },
          ringBorderStyle,
        ]}
      />

      {/* Solid background circle to keep text readable */}
      <View
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Inner content — always fully opaque */}
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
            {isActive ? 'ACTIVE TRIP' : 'No Active Trip'}
          </Text>

          {isActive ? (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 16,
                    color: Colors.textPrimary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDistance(activeTrip.currentDistance, preferences.distanceUnit)}
                </Text>
                <View style={{ width: 1, height: 14, backgroundColor: Colors.surface }} />
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 16,
                    color: Colors.textPrimary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDuration(elapsed)}
                </Text>
              </View>
              <Text
                selectable
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 14,
                  color: Colors.textSecondary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatSpeed(activeTrip.currentSpeed, preferences.distanceUnit)}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 13,
                color: Colors.textSecondary,
                textAlign: 'center',
                maxWidth: 140,
              }}
            >
              Waiting for movement...
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
