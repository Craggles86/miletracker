import { View, Text, TextInput, ScrollView, Switch, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { SettingsSection } from '@/components/settings-section';
import { UnitToggle } from '@/components/unit-toggle';
import { BusinessDayRow } from '@/components/business-day-row';
import { generateCSV, exportCSV } from '@/utils/csv-export';
import type { DaySchedule } from '@/store/types';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const trips = useAppStore((s) => s.trips);

  const handleDayChange = (day: string, schedule: DaySchedule) => {
    updateSettings({
      businessHoursPerDay: {
        ...settings.businessHoursPerDay,
        [day]: schedule,
      },
    });
  };

  const handleExport = async () => {
    const csv = generateCSV(trips, settings);
    await exportCSV(csv);
  };

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

      {/* User Profile */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <SettingsSection title="User Profile">
          <TextInput
            value={settings.userName}
            onChangeText={(t) => updateSettings({ userName: t })}
            placeholder="Name"
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={settings.vehicleMake}
            onChangeText={(t) => updateSettings({ vehicleMake: t })}
            placeholder="Vehicle Make (e.g. Toyota)"
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={settings.vehicleModel}
            onChangeText={(t) => updateSettings({ vehicleModel: t })}
            placeholder="Vehicle Model (e.g. Corolla)"
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={settings.startingOdometer != null ? String(settings.startingOdometer) : ''}
            onChangeText={(t) => {
              const val = parseFloat(t);
              updateSettings({ startingOdometer: isNaN(val) ? null : val });
            }}
            placeholder="Starting Odometer"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            style={inputStyle}
          />
        </SettingsSection>
      </Animated.View>

      {/* Smart Business Classification */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <SettingsSection title="Smart Business Classification">
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 14,
              color: Colors.textPrimary,
              marginBottom: 4,
            }}
          >
            Business Hours Schedule
          </Text>
          {DAY_ORDER.map((day) => (
            <BusinessDayRow
              key={day}
              day={day}
              schedule={
                settings.businessHoursPerDay[day] || {
                  enabled: false,
                  startTime: '09:00',
                  endTime: '17:00',
                }
              }
              onChange={(sched) => handleDayChange(day, sched)}
            />
          ))}
        </SettingsSection>
      </Animated.View>

      {/* Distance Unit */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <SettingsSection title="Distance Unit">
          <UnitToggle
            value={settings.distanceUnit}
            onChange={(unit) => updateSettings({ distanceUnit: unit })}
          />
        </SettingsSection>
      </Animated.View>

      {/* Auto Export */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <SettingsSection title="Auto Export (End of Financial Year)">
          <TextInput
            value={settings.exportEmail}
            onChangeText={(t) => updateSettings({ exportEmail: t })}
            placeholder="Email Address"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={inputStyle}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 15,
                color: Colors.textPrimary,
              }}
            >
              Enable Auto Export
            </Text>
            <Switch
              value={settings.autoExportEnabled}
              onValueChange={(val) => updateSettings({ autoExportEnabled: val })}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => ({
              backgroundColor: 'transparent',
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingVertical: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.primary,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 15,
                color: Colors.primary,
              }}
            >
              Export to CSV
            </Text>
          </Pressable>
        </SettingsSection>
      </Animated.View>

      {/* Weekly Odometer Prompt */}
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
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 15,
                color: Colors.textPrimary,
              }}
            >
              Weekly Odometer Prompt
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 12,
                color: Colors.textSecondary,
              }}
            >
              Calibrate GPS distances weekly
            </Text>
          </View>
          <Switch
            value={settings.weeklyOdometerPromptEnabled}
            onValueChange={(val) =>
              updateSettings({ weeklyOdometerPromptEnabled: val })
            }
            trackColor={{ false: Colors.surface, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </Animated.View>

      {/* GPS Info */}
      <Animated.View entering={FadeInDown.delay(600).duration(400)}>
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
              Trips start automatically when speed exceeds 10 km/h and end after
              5 minutes of inactivity within a 20m radius. Location permissions
              must be granted.
            </Text>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const inputStyle = {
  backgroundColor: Colors.surface,
  borderRadius: 10,
  borderCurve: 'continuous' as const,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontFamily: Fonts.medium,
  fontSize: 15,
  color: Colors.textPrimary,
};
