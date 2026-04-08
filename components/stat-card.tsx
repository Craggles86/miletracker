import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  index?: number;
}

export function StatCard({ label, value, unit, index = 0 }: StatCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(200 + index * 100).duration(400)}
      style={{
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 11,
          color: Colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text
          selectable
          style={{
            fontFamily: Fonts.bold,
            fontSize: 22,
            color: Colors.textPrimary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
        {unit && (
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 14,
              color: Colors.textSecondary,
            }}
          >
            {unit}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
