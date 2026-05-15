import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { TripPurpose } from '@/store/types';
import { colors, spacing, radius, typography } from '@/constants/theme';

type FilterOption = 'All' | TripPurpose;

interface PurposeFilterProps {
  selected: FilterOption;
  onSelect: (option: FilterOption) => void;
}

const OPTIONS: FilterOption[] = ['All', 'Business', 'Personal'];

export function PurposeFilter({ selected, onSelect }: PurposeFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={styles.container}
    >
      {OPTIONS.map((option) => {
        const isSelected = selected === option;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.chip, isSelected && styles.chipActive]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.callout,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
