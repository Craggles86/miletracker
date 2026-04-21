import { useState } from 'react';
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
import { LegalDisclaimerModal } from '@/components/legal-disclaimer-modal';
import { BackgroundTrackingToggle } from '@/components/background-tracking-toggle';
import { generateCSV, exportCSV } from '@/utils/csv-export';
import { sendFeedbackEmail } from '@/utils/feedback';
import { useTranslation } from '@/i18n/useTranslation';
import type { DaySchedule } from '@/store/types';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const trips = useAppStore((s) => s.trips);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

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
        paddingBottom: insets.bottom + 40,
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
          {t('settings.title')}
        </Text>
      </Animated.View>

      {/* User Profile */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <SettingsSection title={t('settings.userProfile')}>
          <TextInput
            value={settings.userName}
            onChangeText={(txt) => updateSettings({ userName: txt })}
            placeholder={t('settings.namePlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={settings.vehicleMake}
            onChangeText={(txt) => updateSettings({ vehicleMake: txt })}
            placeholder={t('settings.vehicleMakePlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={settings.vehicleModel}
            onChangeText={(txt) => updateSettings({ vehicleModel: txt })}
            placeholder={t('settings.vehicleModelPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={settings.vehicleYear}
            onChangeText={(txt) => {
              // Allow only numeric characters, max 4 digits
              const cleaned = txt.replace(/[^0-9]/g, '').slice(0, 4);
              updateSettings({ vehicleYear: cleaned });
            }}
            placeholder={t('settings.vehicleYearPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            maxLength={4}
            style={inputStyle}
          />
          <TextInput
            value={settings.vehicleRegistration}
            onChangeText={(txt) => updateSettings({ vehicleRegistration: txt })}
            placeholder={t('settings.registrationPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="characters"
            style={inputStyle}
          />
          <TextInput
            value={settings.startingOdometer != null ? String(settings.startingOdometer) : ''}
            onChangeText={(txt) => {
              const val = parseFloat(txt);
              updateSettings({ startingOdometer: isNaN(val) ? null : val });
            }}
            placeholder={t('settings.startingOdometerPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            style={inputStyle}
          />
        </SettingsSection>
      </Animated.View>

      {/* Log all as Business toggle */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 16,
            borderWidth: 1,
            borderColor: settings.logAllAsBusiness
              ? `${Colors.primary}60`
              : Colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Ionicons
              name="briefcase"
              size={18}
              color={
                settings.logAllAsBusiness ? Colors.primary : Colors.textSecondary
              }
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 15,
                  color: Colors.textPrimary,
                }}
              >
                {t('settings.logAllTitle')}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.regular,
                  fontSize: 12,
                  color: Colors.textSecondary,
                }}
              >
                {t('settings.logAllSubtitle')}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.logAllAsBusiness}
            onValueChange={(val) => updateSettings({ logAllAsBusiness: val })}
            trackColor={{ false: Colors.surface, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </Animated.View>

      {/* Smart Business Classification */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <SettingsSection title={t('settings.smartClassification')}>
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 14,
              color: Colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {t('settings.businessHoursSchedule')}
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
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <SettingsSection title={t('settings.distanceUnit')}>
          <UnitToggle
            value={settings.distanceUnit}
            onChange={(unit) =>
              // Mark as auto-detected=true so locale detection doesn't override
              // the user's explicit selection on future launches.
              updateSettings({ distanceUnit: unit, distanceUnitAutoDetected: true })
            }
          />
        </SettingsSection>
      </Animated.View>

      {/* Auto Export */}
      <Animated.View entering={FadeInDown.delay(500).duration(400)}>
        <SettingsSection title={t('settings.autoExport')}>
          <TextInput
            value={settings.exportEmail}
            onChangeText={(txt) => updateSettings({ exportEmail: txt })}
            placeholder={t('settings.emailPlaceholder')}
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
              {t('settings.enableAutoExport')}
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
              {t('settings.exportToCsv')}
            </Text>
          </Pressable>
        </SettingsSection>
      </Animated.View>

      {/* Weekly Odometer Prompt */}
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
              {t('settings.weeklyOdoTitle')}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 12,
                color: Colors.textSecondary,
              }}
            >
              {t('settings.weeklyOdoSubtitle')}
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

      {/* Background GPS Tracking */}
      <Animated.View entering={FadeInDown.delay(700).duration(400)}>
        <BackgroundTrackingToggle />
      </Animated.View>

      {/* Manual Tracking info */}
      <Animated.View entering={FadeInDown.delay(750).duration(400)}>
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
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
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontFamily: Fonts.semiBold,
                  fontSize: 15,
                  color: Colors.textPrimary,
                }}
              >
                {t('settings.manualTitle')}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.regular,
                  fontSize: 12,
                  color: Colors.textSecondary,
                }}
              >
                {t('settings.manualSubtitle')}
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 13,
              color: Colors.textSecondary,
              lineHeight: 18,
            }}
          >
            {t('settings.manualDescription')}
          </Text>
        </View>
      </Animated.View>

      {/* Send Feedback */}
      <Animated.View entering={FadeInDown.delay(780).duration(400)}>
        <Pressable
          onPress={sendFeedbackEmail}
          style={({ pressed }) => ({
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
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
              <Ionicons name="mail-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontFamily: Fonts.semiBold,
                  fontSize: 15,
                  color: Colors.textPrimary,
                }}
              >
                {t('settings.sendFeedback')}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.regular,
                  fontSize: 12,
                  color: Colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {t('settings.feedbackSubtitle')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </Pressable>
      </Animated.View>

      {/* Legal Disclaimer */}
      <Animated.View entering={FadeInDown.delay(800).duration(400)}>
        <Pressable
          onPress={() => setDisclaimerVisible(true)}
          style={({ pressed }) => ({
            backgroundColor: Colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="document-text" size={18} color={Colors.textSecondary} />
            </View>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 15,
                color: Colors.textPrimary,
              }}
            >
              {t('settings.legalDisclaimer')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </Pressable>
      </Animated.View>

      <LegalDisclaimerModal
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />
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
