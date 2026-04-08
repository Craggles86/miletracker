import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import type { FavouriteLocation } from '@/store/types';

interface FavouriteCardProps {
  favourite: FavouriteLocation;
  index: number;
  onDelete: () => void;
}

function getLabelIcon(label: string): 'home' | 'briefcase' | 'star' {
  const lower = label.toLowerCase();
  if (lower === 'home') return 'home';
  if (lower === 'work' || lower === 'office') return 'briefcase';
  return 'star';
}

function getLabelColor(label: string): string {
  const lower = label.toLowerCase();
  if (lower === 'home') return Colors.accent;
  if (lower === 'work' || lower === 'office') return Colors.primary;
  return '#F59E0B';
}

export function FavouriteCard({ favourite, index, onDelete }: FavouriteCardProps) {
  const icon = getLabelIcon(favourite.label);
  const color = getLabelColor(favourite.label);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(350)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.duration(250)}
    >
      <View
        style={{
          backgroundColor: Colors.card,
          borderRadius: 14,
          borderCurve: 'continuous',
          padding: 16,
          borderWidth: 1,
          borderColor: Colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: `${color}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 16,
              color: Colors.textPrimary,
            }}
          >
            {favourite.label}
          </Text>
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 13,
              color: Colors.textSecondary,
            }}
            numberOfLines={1}
          >
            {favourite.suburb || favourite.address}
          </Text>
        </View>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
