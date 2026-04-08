import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}

export function DaySelector({ selectedDays, onChange }: DaySelectorProps) {
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {ALL_DAYS.map((day) => {
        const isSelected = selectedDays.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggleDay(day)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              borderCurve: 'continuous',
              backgroundColor: isSelected ? Colors.primary : Colors.surface,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isSelected ? Colors.primary : Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: isSelected ? Fonts.semiBold : Fonts.regular,
                fontSize: 12,
                color: isSelected ? '#fff' : Colors.textSecondary,
              }}
            >
              {day}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
