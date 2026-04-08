import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import type { TripPurpose } from '@/store/types';

type FilterOption = 'All' | TripPurpose;

interface PurposeFilterProps {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
}

export function PurposeFilter({ selected, onChange }: PurposeFilterProps) {
  const options: FilterOption[] = ['All', 'Business', 'Personal'];

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
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
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
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type { FilterOption };
