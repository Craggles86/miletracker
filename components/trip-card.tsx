import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  LinearTransition,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { formatDistance, formatDuration, formatTripDate } from '@/utils/helpers';
import type { Trip } from '@/store/types';

interface TripCardProps {
  trip: Trip;
  unit: 'km' | 'miles';
  index: number;
  onPress: () => void;
  onDelete: () => void;
}

export function TripCard({ trip, unit, index, onPress, onDelete }: TripCardProps) {
  const translateX = useSharedValue(0);
  const deleteWidth = 80;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((e) => {
      // Only allow left swipe
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, -deleteWidth - 20);
      }
    })
    .onEnd((e) => {
      if (e.translationX < -deleteWidth / 2) {
        translateX.value = withTiming(-deleteWidth);
      } else {
        translateX.value = withTiming(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / deleteWidth),
  }));

  const isBusiness = trip.purpose === 'Business';
  const badgeColor = isBusiness ? Colors.businessBadge : Colors.personalBadge;

  const routeLabel = trip.startLocation && trip.endLocation
    ? `${trip.startLocation} → ${trip.endLocation}`
    : trip.startLocation || trip.endLocation || 'Unknown Route';

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(350)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.duration(250)}
      style={{ overflow: 'hidden', borderRadius: 14, borderCurve: 'continuous' }}
    >
      {/* Delete background */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: deleteWidth,
            backgroundColor: Colors.dangerBg,
            borderRadius: 14,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          },
          deleteStyle,
        ]}
      >
        <Pressable
          onPress={onDelete}
          style={{ alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 }}
        >
          <Ionicons name="trash" size={22} color="#fff" />
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 12, color: '#fff' }}>
            Delete
          </Text>
        </Pressable>
      </Animated.View>

      {/* Card content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardStyle}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              backgroundColor: Colors.card,
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 16,
              borderWidth: 1,
              borderColor: Colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {/* Header: date + badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
                {formatTripDate(trip.startTime)}
              </Text>
              <View
                style={{
                  backgroundColor: badgeColor,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 11, color: '#fff' }}>
                  {trip.purpose}
                </Text>
              </View>
            </View>

            {/* Route */}
            <Text
              selectable
              style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary, marginBottom: 6 }}
              numberOfLines={1}
            >
              {routeLabel}
            </Text>

            {/* Stats */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="navigate-outline" size={14} color={Colors.textSecondary} />
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 13,
                    color: Colors.textSecondary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDistance(trip.distance, unit)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 13,
                    color: Colors.textSecondary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDuration(trip.duration)}
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
