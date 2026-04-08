import { View, Text } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          fontFamily: Fonts.semiBold,
          fontSize: 16,
          color: Colors.textPrimary,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: Colors.card,
          borderRadius: 14,
          borderCurve: 'continuous',
          padding: 16,
          borderWidth: 1,
          borderColor: Colors.border,
          gap: 16,
        }}
      >
        {children}
      </View>
    </View>
  );
}
