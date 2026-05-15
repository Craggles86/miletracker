import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { colors, spacing, radius, typography } from '@/constants/theme';

export function OdometerModal() {
  const insets = useSafeAreaInsets();
  const showModal = useAppStore((s) => s.showOdometerModal);
  const recordOdometer = useAppStore((s) => s.recordOdometer);
  const skipOdometerPrompt = useAppStore((s) => s.skipOdometerPrompt);
  const lastReading = useAppStore((s) => s.settings.lastOdometerReading);
  const unit = useAppStore((s) => s.settings.distanceUnit);

  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const reading = parseFloat(value);
    if (isNaN(reading) || reading <= 0) return;
    recordOdometer(reading);
    setValue('');
  };

  const handleSkip = () => {
    skipOdometerPrompt();
    setValue('');
  };

  if (!showModal) return null;

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="speedometer" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Weekly Odometer Check</Text>
            <Text style={styles.subtitle}>
              Enter your current odometer reading to calibrate trip distances
            </Text>
          </View>

          {lastReading > 0 && (
            <Text style={styles.lastReading}>
              Last reading: {lastReading.toLocaleString()} {unit}
            </Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={`Current reading (${unit})`}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={value}
              onChangeText={setValue}
              autoFocus
            />
          </View>

          <View style={styles.buttons}>
            <Pressable onPress={handleSubmit} style={styles.submitBtn}>
              <Text style={styles.submitText}>Save Reading</Text>
            </Pressable>
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip This Week</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 380,
    gap: spacing.lg,
    borderCurve: 'continuous',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 20,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lastReading: {
    ...typography.callout,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    borderCurve: 'continuous',
  },
  buttons: {
    gap: spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  submitText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  skipBtn: {
    padding: spacing.md,
    alignItems: 'center',
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
