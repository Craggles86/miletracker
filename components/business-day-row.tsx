import { useState } from 'react';
import { View, Text, Switch, Pressable, Modal } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { formatDisplayTime } from '@/utils/helpers';
import type { DaySchedule } from '@/store/types';

interface BusinessDayRowProps {
  day: string;
  schedule: DaySchedule;
  onChange: (schedule: DaySchedule) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm

export function BusinessDayRow({ day, schedule, onChange }: BusinessDayRowProps) {
  const [pickingField, setPickingField] = useState<'start' | 'end' | null>(null);

  const handleTimePick = (hour: number) => {
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    if (pickingField === 'start') {
      onChange({ ...schedule, startTime: timeStr });
    } else if (pickingField === 'end') {
      onChange({ ...schedule, endTime: timeStr });
    }
    setPickingField(null);
  };

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 40,
        }}
      >
        {/* Day label */}
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 14,
            color: schedule.enabled ? Colors.textPrimary : Colors.textSecondary,
            width: 32,
          }}
        >
          {day}
        </Text>

        {/* Toggle */}
        <Switch
          value={schedule.enabled}
          onValueChange={(enabled) => onChange({ ...schedule, enabled })}
          trackColor={{ false: Colors.surface, true: Colors.primary }}
          thumbColor="#fff"
          style={{ transform: [{ scale: 0.75 }] }}
        />

        {/* Time fields */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: schedule.enabled ? 1 : 0.35,
          }}
          pointerEvents={schedule.enabled ? 'auto' : 'none'}
        >
          <Pressable
            onPress={() => setPickingField('start')}
            style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: 8,
              borderCurve: 'continuous',
              paddingVertical: 6,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 12,
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDisplayTime(schedule.startTime)}
            </Text>
          </Pressable>

          <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
            —
          </Text>

          <Pressable
            onPress={() => setPickingField('end')}
            style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: 8,
              borderCurve: 'continuous',
              paddingVertical: 6,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 12,
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDisplayTime(schedule.endTime)}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Time picker modal */}
      <Modal
        visible={pickingField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickingField(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setPickingField(null)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: Colors.card,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              width: 280,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 16,
                color: Colors.textPrimary,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              {day} — {pickingField === 'start' ? 'Start Time' : 'End Time'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              {HOURS.map((h) => {
                const timeStr = `${String(h).padStart(2, '0')}:00`;
                const currentVal =
                  pickingField === 'start'
                    ? schedule.startTime
                    : schedule.endTime;
                const isSelected = currentVal === timeStr;
                return (
                  <Pressable
                    key={h}
                    onPress={() => handleTimePick(h)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderCurve: 'continuous',
                      backgroundColor: isSelected ? Colors.primary : Colors.surface,
                      minWidth: 74,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? Fonts.semiBold : Fonts.regular,
                        fontSize: 13,
                        color: isSelected ? '#fff' : Colors.textPrimary,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatDisplayTime(timeStr)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
