import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { colors, spacing, radius, typography } from '@/constants/theme';

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hasAcceptedTerms = useAppStore((s) => s.settings.hasAcceptedTerms);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [accepted, setAccepted] = useState(false);

  // If user already accepted, they're viewing from Settings — show read-only mode
  const isReadOnly = hasAcceptedTerms;

  const handleAgree = () => {
    updateSettings({ hasAcceptedTerms: true });
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        {isReadOnly && (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.backText}>Settings</Text>
          </Pressable>
        )}
        <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>
          {isReadOnly ? 'MileageTrack legal information' : 'Please review before continuing'}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.scrollContainer}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.body}>
            By downloading, installing, or using MileageTrack (&ldquo;the App&rdquo;), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the App.
          </Text>

          <Text style={styles.sectionTitle}>2. Purpose of the App</Text>
          <Text style={styles.body}>
            MileageTrack is designed to assist users in recording vehicle mileage for personal and business use. The App uses GPS location data to estimate trip distances and provides tools for categorising trips as business or personal.
          </Text>

          <Text style={styles.sectionTitle}>3. Accuracy Disclaimer</Text>
          <Text style={styles.body}>
            GPS-based distance measurements are estimates and may differ from actual odometer readings due to signal quality, environmental conditions, and device limitations. Users are encouraged to enable the weekly odometer prompt to calibrate readings. MileageTrack does not guarantee the accuracy of any recorded data and is not liable for discrepancies in tax filings or expense claims based on app data.
          </Text>

          <Text style={styles.sectionTitle}>4. Data Collection & Privacy</Text>
          <Text style={styles.body}>
            MileageTrack collects and stores location data solely on your device to provide trip tracking functionality. No personal data is transmitted to external servers. Location data is only collected while the app is in active use and location permissions are granted. You may revoke location permissions at any time through your device settings.
          </Text>

          <Text style={styles.sectionTitle}>5. User Responsibilities</Text>
          <Text style={styles.body}>
            You are solely responsible for the accuracy of data entered manually (e.g., odometer readings, trip classifications). You must not operate or interact with the App while driving. Ensure all trip records are reviewed for accuracy before using them for official, tax, or reimbursement purposes.
          </Text>

          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.body}>
            To the maximum extent permitted by law, MileageTrack and its developers shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use the App, including but not limited to inaccurate mileage data, lost records, or device battery consumption.
          </Text>

          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          <Text style={styles.body}>
            All content, design, and functionality of the App are the property of the developer and are protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to use the App for personal purposes.
          </Text>

          <Text style={styles.sectionTitle}>8. Modifications</Text>
          <Text style={styles.body}>
            We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the updated terms. Material changes will be communicated through an in-app notification.
          </Text>

          <Text style={styles.sectionTitle}>9. Termination</Text>
          <Text style={styles.body}>
            You may stop using the App and delete it at any time. All locally stored data will be removed upon uninstallation.
          </Text>

          <Text style={styles.sectionTitle}>10. Governing Law</Text>
          <Text style={styles.body}>
            These terms are governed by and construed in accordance with the laws of Australia. Any disputes shall be resolved in the courts of the relevant jurisdiction.
          </Text>

          <Text style={[styles.body, styles.lastUpdated]}>
            Last updated: 15 May 2026
          </Text>
        </ScrollView>
      </Animated.View>

      {!isReadOnly && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.footer}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAccepted(!accepted)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the Terms & Conditions
            </Text>
          </Pressable>

          <Pressable
            style={[styles.agreeButton, !accepted && styles.agreeButtonDisabled]}
            onPress={handleAgree}
            disabled={!accepted}
          >
            <Text style={[styles.agreeButtonText, !accepted && styles.agreeButtonTextDisabled]}>
              Continue
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
    minHeight: 44,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  scrollContainer: {
    flex: 1,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  lastUpdated: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  agreeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderCurve: 'continuous',
  },
  agreeButtonDisabled: {
    backgroundColor: colors.surface,
  },
  agreeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  agreeButtonTextDisabled: {
    color: colors.textMuted,
  },
});
