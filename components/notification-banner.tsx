import { View, Text } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

interface NotificationBannerProps {
  visible: boolean;
  title: string;
  message: string;
}

export function NotificationBanner({ visible, title, message }: NotificationBannerProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(350)}
      exiting={SlideOutUp.duration(250)}
      style={{
        backgroundColor: Colors.card,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 14,
        borderWidth: 1,
        borderColor: `${Colors.accent}40`,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        boxShadow: `0 4px 20px ${Colors.accent}20`,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          borderCurve: 'continuous',
          backgroundColor: `${Colors.primary}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="car" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: Fonts.semiBold,
            fontSize: 13,
            color: Colors.textPrimary,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 12,
            color: Colors.textSecondary,
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
