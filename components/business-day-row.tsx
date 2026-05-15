import React, { useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DayOfWeek, BusinessHours } from '@/store/types';
import { useAppStore } from '@/store/app-store';
import { colors, spacing, radius, typography } from '@/constants/theme';

interface BusinessDayRowProps {
  day: DayOfWeek;
  config: BusinessHours;
}

export function BusinessDayRow({ day, config }: BusinessDayRowProps) {
  const updateBusinessHours = useAppStore((s) => s.updateBusinessHours);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const timeToDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const handleStartChange = (_: unknown, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (date) {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      updateBusinessHours(day, { startTime: `${h}:${m}` });
    }
  };

  const handleEndChange = (_: unknown, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (date) {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      updateBusinessHours(day, { endTime: `${h}:${m}` });
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.dayToggle}>
        <Text style={[styles.dayText, !config.enabled && styles.dayDisabled]}>{day}</Text>
        <Switch
          value={config.enabled}
          onValueChange={(enabled) => updateBusinessHours(day, { enabled })}
          trackColor={{ false: colors.surface, true: colors.primary + '60' }}
          thumbColor={config.enabled ? colors.primary : colors.textMuted}
        />
      </View>
      {config.enabled && (
        <View style={styles.timeRow}>
          <Pressable onPress={() => setShowStartPicker(true)} style={styles.timeBtn}>
            <Text style={styles.timeText}>{config.startTime}</Text>
          </Pressable>
          <Text style={styles.timeSep}>to</Text>
          <Pressable onPress={() => setShowEndPicker(true)} style={styles.timeBtn}>
            <Text style={styles.timeText}>{config.endTime}</Text>
          </Pressable>
        </View>
      )}

      {showStartPicker && (
        <DateTimePicker
          value={timeToDate(config.startTime)}
          mode="time"
          is24Hour
          onChange={handleStartChange}
          themeVariant="dark"
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={timeToDate(config.endTime)}
          mode="time"
          is24Hour
          onChange={handleEndChange}
          themeVariant="dark"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    width: 40,
  },
  dayDisabled: {
    color: colors.textMuted,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xxxl,
  },
  timeBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  timeText: {
    ...typography.callout,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timeSep: {
    ...typography.callout,
    color: colors.textMuted,
  },
});
