import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  Modal,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
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
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ... 55

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

// Snap minute to nearest 5
function snapMinute(m: number): number {
  return Math.round(m / 5) * 5 >= 60 ? 55 : Math.round(m / 5) * 5;
}

interface WheelColumnProps {
  data: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  formatLabel: (value: number) => string;
}

function WheelColumn({ data, selectedValue, onValueChange, formatLabel }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const ignoreNextScroll = useRef(false);

  const selectedIndex = data.indexOf(selectedValue);

  useEffect(() => {
    // Scroll to initial position after mount
    const timer = setTimeout(() => {
      if (scrollRef.current && selectedIndex >= 0) {
        ignoreNextScroll.current = true;
        scrollRef.current.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (ignoreNextScroll.current) {
        ignoreNextScroll.current = false;
        return;
      }
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      onValueChange(data[clampedIndex]);
    },
    [data, onValueChange]
  );

  const handleItemPress = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
      onValueChange(data[index]);
    },
    [data, onValueChange]
  );

  // Padding so first and last items can be centred
  const topPadding = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <View style={{ height: PICKER_HEIGHT, flex: 1, overflow: 'hidden' }}>
      {/* Selection highlight band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: topPadding,
          left: 4,
          right: 4,
          height: ITEM_HEIGHT,
          backgroundColor: Colors.primary,
          borderRadius: 10,
          borderCurve: 'continuous',
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: topPadding,
        }}
      >
        {data.map((value, index) => {
          const isSelected = value === selectedValue;
          return (
            <Pressable
              key={value}
              onPress={() => handleItemPress(index)}
              style={{
                height: ITEM_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: isSelected ? Fonts.semiBold : Fonts.regular,
                  fontSize: 16,
                  color: isSelected ? '#fff' : Colors.textSecondary,
                  fontVariant: ['tabular-nums'],
                  zIndex: 2,
                }}
              >
                {formatLabel(value)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function BusinessDayRow({ day, schedule, onChange }: BusinessDayRowProps) {
  const [pickingField, setPickingField] = useState<'start' | 'end' | null>(null);

  const currentTimeStr = pickingField === 'start' ? schedule.startTime : schedule.endTime;
  const parsed = parseTime(currentTimeStr);
  const [tempHour, setTempHour] = useState(parsed.hour);
  const [tempMinute, setTempMinute] = useState(snapMinute(parsed.minute));

  // Sync temp values when modal opens
  useEffect(() => {
    if (pickingField) {
      const t = pickingField === 'start' ? schedule.startTime : schedule.endTime;
      const p = parseTime(t);
      setTempHour(p.hour);
      setTempMinute(snapMinute(p.minute));
    }
  }, [pickingField]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    const timeStr = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    if (pickingField === 'start') {
      onChange({ ...schedule, startTime: timeStr });
    } else if (pickingField === 'end') {
      onChange({ ...schedule, endTime: timeStr });
    }
    setPickingField(null);
  };

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display} ${period}`;
  };

  const formatMinuteLabel = (m: number) => String(m).padStart(2, '0');

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
              width: 300,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 16,
                color: Colors.textPrimary,
                marginBottom: 4,
                textAlign: 'center',
              }}
            >
              {day} — {pickingField === 'start' ? 'Start Time' : 'End Time'}
            </Text>

            {/* Preview of selected time */}
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 22,
                color: Colors.primary,
                textAlign: 'center',
                marginBottom: 16,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDisplayTime(
                `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`
              )}
            </Text>

            {/* Column labels */}
            <View style={{ flexDirection: 'row', marginBottom: 8, paddingHorizontal: 8 }}>
              <Text
                style={{
                  flex: 1,
                  fontFamily: Fonts.semiBold,
                  fontSize: 12,
                  color: Colors.textSecondary,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Hour
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontFamily: Fonts.semiBold,
                  fontSize: 12,
                  color: Colors.textSecondary,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Minute
              </Text>
            </View>

            {/* Dual-column picker */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <WheelColumn
                data={HOURS}
                selectedValue={tempHour}
                onValueChange={setTempHour}
                formatLabel={formatHourLabel}
              />
              <WheelColumn
                data={MINUTES}
                selectedValue={tempMinute}
                onValueChange={setTempMinute}
                formatLabel={formatMinuteLabel}
              />
            </View>

            {/* Confirm / Cancel buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setPickingField(null)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: Colors.surface,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 15,
                    color: Colors.textSecondary,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: Colors.primary,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 15,
                    color: '#fff',
                  }}
                >
                  Confirm
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
