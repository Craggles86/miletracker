import { View, Text, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { SettingsSection } from '@/components/settings-section';
import { DaySelector } from '@/components/day-selector';
import { UnitToggle } from '@/components/unit-toggle';
import { TimePickerField } from '@/components/time-picker-field';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const preferences = useAppStore((s) => s.preferences);
  const updatePreferences = useAppStore((s) => s.updatePreferences);

  const { businessHours, distanceUnit, mileageRate, vehicleName } = preferences;

  const rateLabel = distanceUnit === 'miles' ? '/mi' : '/km';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)}>
        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 26,
            color: Colors.textPrimary,
            textAlign: 'center',
          }}
        >
          Settings
        </Text>
      </Animated.View>

      {/* Smart Business Classification */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <SettingsSection title="Smart Business Classification">
          {/* Business Hours Schedule label */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 14,
                color: Colors.textPrimary,
              }}
            >
              Business Hours Schedule
            </Text>
            <DaySelector
              selectedDays={businessHours.days}
              onChange={(days) =>
                updatePreferences({
                  businessHours: { ...businessHours, days },
                })
              }
            />
          </View>

          {/* Time pickers */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TimePickerField
              label="Start Time:"
              value={businessHours.startTime}
              onChange={(startTime) =>
                updatePreferences({
                  businessHours: { ...businessHours, startTime },
                })
              }
            />
            <TimePickerField
              label="End Time:"
              value={businessHours.endTime}
              onChange={(endTime) =>
                updatePreferences({
                  businessHours: { ...businessHours, endTime },
                })
              }
            />
          </View>
        </SettingsSection>
      </Animated.View>

      {/* Distance Unit */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <SettingsSection title="Distance Unit">
          <UnitToggle
            value={distanceUnit}
            onChange={(unit) => {
              const newRate = unit === 'miles' ? 0.67 : 0.42;
              updatePreferences({ distanceUnit: unit, mileageRate: newRate });
            }}
          />
        </SettingsSection>
      </Animated.View>

      {/* Mileage Rate */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <SettingsSection title="Mileage Rate">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.surface,
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 16,
                  color: Colors.textSecondary,
                  marginRight: 2,
                }}
              >
                $
              </Text>
              <TextInput
                value={String(mileageRate)}
                onChangeText={(text) => {
                  const val = parseFloat(text);
                  if (!isNaN(val)) {
                    updatePreferences({ mileageRate: val });
                  } else if (text === '' || text === '0.' || text === '.') {
                    // Allow intermediate typing states
                    updatePreferences({ mileageRate: 0 });
                  }
                }}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  fontFamily: Fonts.medium,
                  fontSize: 16,
                  color: Colors.textPrimary,
                  fontVariant: ['tabular-nums'],
                }}
                placeholderTextColor={Colors.textSecondary}
              />
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 14,
                  color: Colors.textSecondary,
                }}
              >
                {rateLabel}
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                borderCurve: 'continuous',
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
            </View>
          </View>
        </SettingsSection>
      </Animated.View>

      {/* Vehicle */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <SettingsSection title="Vehicle">
          <TextInput
            value={vehicleName}
            onChangeText={(text) => updatePreferences({ vehicleName: text })}
            placeholder="e.g. Tesla Model 3"
            placeholderTextColor={Colors.textSecondary}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 10,
              borderCurve: 'continuous',
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: Fonts.medium,
              fontSize: 15,
              color: Colors.textPrimary,
            }}
          />
        </SettingsSection>
      </Animated.View>

      {/* GPS Info */}
      <Animated.View entering={FadeInDown.delay(500).duration(400)}>
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: `${Colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="navigate" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 14,
                color: Colors.textPrimary,
              }}
            >
              GPS Tracking
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 13,
                color: Colors.textSecondary,
                lineHeight: 18,
              }}
            >
              Trips start automatically when speed exceeds 10 km/h and end after 5
              minutes of inactivity within a 20m radius. Location permissions must be
              granted.
            </Text>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
