import React from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { SettingsSection } from '@/components/settings-section';
import { BusinessDayRow } from '@/components/business-day-row';
import { DayOfWeek } from '@/store/types';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { generateCSV } from '@/utils/csv-export';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const trips = useAppStore((s) => s.trips);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const handleExportNow = async () => {
    try {
      const csv = generateCSV(trips, settings);

      if (Platform.OS === 'web') {
        Alert.alert('Export', 'CSV export is only available on mobile devices.');
        return;
      }

      const LegacyFS = await import('expo-file-system/legacy');
      const MailComposer = await import('expo-mail-composer');
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert('Email Not Available', 'No email client is configured on this device.');
        return;
      }

      const docDir = LegacyFS.documentDirectory;
      if (!docDir) {
        Alert.alert('Export Failed', 'File system not available.');
        return;
      }
      const fileUri = docDir + 'mileagetrack-export.csv';
      await LegacyFS.writeAsStringAsync(fileUri, csv);

      await MailComposer.composeAsync({
        recipients: settings.exportEmail ? [settings.exportEmail] : [],
        subject: 'MileageTrack Export',
        body: 'Your MileageTrack mileage export is attached.',
        attachments: [fileUri],
      });
    } catch {
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    }
  };

  const handleFeedback = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Feedback', 'Email feedback is only available on mobile devices.');
        return;
      }
      const MailComposer = await import('expo-mail-composer');
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Email Not Available', 'No email client is configured on this device.');
        return;
      }
      await MailComposer.composeAsync({
        recipients: ['craig.lindeman@outlook.com'],
        subject: 'MileageTrack Feedback',
      });
    } catch {
      Alert.alert('Error', 'Unable to open email composer.');
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Text style={styles.title}>Settings</Text>
      </Animated.View>

      {/* Profile */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <SettingsSection title="Profile">
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={settings.userName}
            onChangeText={(val) => updateSettings({ userName: val })}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Vehicle make"
              placeholderTextColor={colors.textMuted}
              value={settings.vehicleMake}
              onChangeText={(val) => updateSettings({ vehicleMake: val })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Vehicle model"
              placeholderTextColor={colors.textMuted}
              value={settings.vehicleModel}
              onChangeText={(val) => updateSettings({ vehicleModel: val })}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Starting odometer"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={settings.startingOdometer ? String(settings.startingOdometer) : ''}
            onChangeText={(val) => updateSettings({ startingOdometer: parseInt(val) || 0 })}
          />
        </SettingsSection>
      </Animated.View>

      {/* Distance Unit */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <SettingsSection title="Distance Unit">
          <View style={styles.unitToggle}>
            <Pressable
              onPress={() => updateSettings({ distanceUnit: 'km' })}
              style={[
                styles.unitBtn,
                settings.distanceUnit === 'km' && styles.unitBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.unitBtnText,
                  settings.distanceUnit === 'km' && styles.unitBtnTextActive,
                ]}
              >
                Kilometres
              </Text>
            </Pressable>
            <Pressable
              onPress={() => updateSettings({ distanceUnit: 'miles' })}
              style={[
                styles.unitBtn,
                settings.distanceUnit === 'miles' && styles.unitBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.unitBtnText,
                  settings.distanceUnit === 'miles' && styles.unitBtnTextActive,
                ]}
              >
                Miles
              </Text>
            </Pressable>
          </View>
        </SettingsSection>
      </Animated.View>

      {/* Business Hours */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <SettingsSection title="Business Hours">
          {DAYS.map((day) => (
            <BusinessDayRow key={day} day={day} config={settings.businessHoursPerDay[day]} />
          ))}
        </SettingsSection>
      </Animated.View>

      {/* Odometer */}
      <Animated.View entering={FadeInDown.duration(400).delay(400)}>
        <SettingsSection title="Odometer">
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Weekly odometer prompt</Text>
            <Switch
              value={settings.weeklyOdometerPromptEnabled}
              onValueChange={(val) => updateSettings({ weeklyOdometerPromptEnabled: val })}
              trackColor={{ false: colors.surface, true: colors.primary + '60' }}
              thumbColor={settings.weeklyOdometerPromptEnabled ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.odometerHint}>
            Recommended for accurate mileage records. Weekly readings help calibrate GPS distance against your actual odometer.
          </Text>
        </SettingsSection>
      </Animated.View>

      {/* Export */}
      <Animated.View entering={FadeInDown.duration(400).delay(500)}>
        <SettingsSection title="Export">
          <TextInput
            style={styles.input}
            placeholder="Export email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={settings.exportEmail}
            onChangeText={(val) => updateSettings({ exportEmail: val })}
          />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Auto export (30 June)</Text>
            <Switch
              value={settings.autoExportEnabled}
              onValueChange={(val) => updateSettings({ autoExportEnabled: val })}
              trackColor={{ false: colors.surface, true: colors.primary + '60' }}
              thumbColor={settings.autoExportEnabled ? colors.primary : colors.textMuted}
            />
          </View>
          <Pressable onPress={handleExportNow} style={styles.exportBtn}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.exportBtnText}>Export Now</Text>
          </Pressable>
        </SettingsSection>
      </Animated.View>

      {/* About */}
      <Animated.View entering={FadeInDown.duration(400).delay(600)}>
        <SettingsSection title="About">
          <Pressable onPress={handleFeedback} style={styles.linkRow}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={styles.linkText}>Send Feedback</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={() => router.push('/legal')}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.linkText}>Legal</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>MileageTrack v1.0.0</Text>
          </View>
        </SettingsSection>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    ...typography.body,
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    borderCurve: 'continuous',
  },
  unitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  unitBtnActive: {
    backgroundColor: colors.primary,
  },
  unitBtnText: {
    ...typography.callout,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  odometerHint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 16,
    paddingTop: spacing.xs,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    padding: spacing.lg,
    borderCurve: 'continuous',
  },
  exportBtnText: {
    ...typography.headline,
    color: colors.primary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  versionRow: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
