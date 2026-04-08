import { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import Ionicons from '@expo/vector-icons/Ionicons';

interface TimePickerFieldProps {
  label: string;
  value: string; // "HH:mm"
  onChange: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: Colors.surface,
          borderRadius: 10,
          borderCurve: 'continuous',
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 14,
            color: Colors.textPrimary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatDisplayTime(value)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowPicker(false)}
        >
          <Pressable
            style={{
              backgroundColor: Colors.card,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              width: 280,
              maxHeight: 360,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            onPress={() => {}} // prevent close when tapping content
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
              {label}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {HOURS.filter((h) => h >= 6 && h <= 22).map((h) =>
                MINUTES.filter((m) => m === 0).map((m) => {
                  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  const isSelected = value === timeStr;
                  return (
                    <Pressable
                      key={timeStr}
                      onPress={() => {
                        onChange(timeStr);
                        setShowPicker(false);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderCurve: 'continuous',
                        backgroundColor: isSelected ? Colors.primary : Colors.surface,
                        minWidth: 72,
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
                })
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
