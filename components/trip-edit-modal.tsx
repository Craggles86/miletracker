import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { formatDistance, formatDuration, formatTripDate, formatTime } from '@/utils/helpers';
import type { Trip, TripPurpose } from '@/store/types';

interface TripEditModalProps {
  trip: Trip | null;
  visible: boolean;
  onClose: () => void;
}

export function TripEditModal({ trip, visible, onClose }: TripEditModalProps) {
  const updateTrip = useAppStore((s) => s.updateTrip);
  const unit = useAppStore((s) => s.preferences.distanceUnit);
  const [purpose, setPurpose] = useState<TripPurpose>('Personal');
  const [notes, setNotes] = useState('');

  // Sync local state when the modal opens with a new trip
  useEffect(() => {
    if (trip) {
      setPurpose(trip.purpose);
      setNotes(trip.notes ?? '');
    }
  }, [trip]);

  const handleSave = () => {
    if (!trip) return;
    updateTrip(trip.id, { purpose, notes: notes.trim() || undefined, autoClassified: false });
    onClose();
  };

  if (!trip) return null;

  const routeLabel = trip.startLocation && trip.endLocation
    ? `${trip.startLocation} → ${trip.endLocation}`
    : 'Unknown Route';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: Colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderCurve: 'continuous',
            maxHeight: '80%',
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.surface }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: Colors.textPrimary }}>
                Trip Details
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Route info */}
            <View
              style={{
                backgroundColor: Colors.card,
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.border,
                gap: 14,
              }}
            >
              <Text
                selectable
                style={{ fontFamily: Fonts.semiBold, fontSize: 18, color: Colors.textPrimary }}
              >
                {routeLabel}
              </Text>
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>Date</Text>
                  <Text selectable style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.textPrimary }}>
                    {formatTripDate(trip.startTime)}
                  </Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>Time</Text>
                  <Text selectable style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                    {formatTime(trip.startTime)} – {formatTime(trip.endTime)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>Distance</Text>
                  <Text selectable style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                    {formatDistance(trip.distance, unit)}
                  </Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>Duration</Text>
                  <Text selectable style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                    {formatDuration(trip.duration)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Purpose toggle */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textPrimary }}>
                Purpose
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: Colors.surface,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  padding: 3,
                }}
              >
                {(['Business', 'Personal'] as TripPurpose[]).map((opt) => {
                  const isSelected = purpose === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setPurpose(opt)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderCurve: 'continuous',
                        backgroundColor: isSelected
                          ? (opt === 'Business' ? Colors.businessBadge : Colors.personalBadge)
                          : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isSelected ? Fonts.semiBold : Fonts.medium,
                          fontSize: 14,
                          color: isSelected ? '#fff' : Colors.textSecondary,
                        }}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textPrimary }}>
                Notes
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note about this trip..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  padding: 14,
                  fontFamily: Fonts.regular,
                  fontSize: 14,
                  color: Colors.textPrimary,
                  minHeight: 80,
                }}
              />
            </View>

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => ({
                backgroundColor: Colors.primary,
                borderRadius: 14,
                borderCurve: 'continuous',
                paddingVertical: 14,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' }}>
                Save Changes
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
