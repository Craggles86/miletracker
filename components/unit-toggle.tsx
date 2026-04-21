import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useTranslation } from '@/i18n/useTranslation';

interface UnitToggleProps {
  value: 'km' | 'miles';
  onChange: (unit: 'km' | 'miles') => void;
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 10,
        borderCurve: 'continuous',
        padding: 3,
      }}
    >
      {(['km', 'miles'] as const).map((unit) => {
        const isSelected = value === unit;
        const label = unit === 'km' ? t('settings.unitKilometres') : t('settings.unitMiles');
        return (
          <Pressable
            key={unit}
            onPress={() => onChange(unit)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              borderCurve: 'continuous',
              backgroundColor: isSelected ? Colors.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: isSelected ? Fonts.semiBold : Fonts.medium,
                fontSize: 13,
                color: isSelected ? '#fff' : Colors.textSecondary,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
