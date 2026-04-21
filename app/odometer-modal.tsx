import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { getWeekId } from '@/utils/helpers';
import { useTranslation } from '@/i18n/useTranslation';

export default function OdometerModal() {
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const trips = useAppStore((s) => s.trips);
  const applyOdometerScaling = useAppStore((s) => s.applyOdometerScaling);
  const addOdometerRecord = useAppStore((s) => s.addOdometerRecord);

  const [reading, setReading] = useState('');
  const [error, setError] = useState('');

  const currentWeekId = getWeekId();
  const lastReading = settings.lastOdometerReading;

  const handleSubmit = () => {
    const odoValue = parseFloat(reading);
    if (isNaN(odoValue) || odoValue <= 0) {
      setError(t('odometer.invalidReading'));
      return;
    }

    if (lastReading !== null && odoValue < lastReading) {
      setError(t('odometer.readingTooLow'));
      return;
    }

    // Calculate scaling factor for the past week
    if (lastReading !== null) {
      const realDistance = odoValue - lastReading;
      const lastWeekId = settings.lastOdometerWeekId || currentWeekId;
      const weekTrips = trips.filter((t) => t.weekId === lastWeekId);
      const gpsTotal = weekTrips.reduce((sum, t) => sum + t.rawDistance, 0);

      if (gpsTotal > 0) {
        const scalingFactor = realDistance / gpsTotal;
        applyOdometerScaling(lastWeekId, scalingFactor);
      }
    }

    // Store the new reading
    addOdometerRecord({
      weekId: currentWeekId,
      odometerReading: odoValue,
      recordedAt: new Date().toISOString(),
      scalingApplied: lastReading !== null,
    });

    updateSettings({
      lastOdometerReading: odoValue,
      lastOdometerWeekId: currentWeekId,
    });

    router.back();
  };

  const handleSkip = () => {
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        padding: 24,
        gap: 24,
      }}
    >
      <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: `${Colors.primary}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="speedometer-outline" size={32} color={Colors.primary} />
        </View>
        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 22,
            color: Colors.textPrimary,
            textAlign: 'center',
          }}
        >
          {t('odometer.title')}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 14,
            color: Colors.textSecondary,
            textAlign: 'center',
            maxWidth: 300,
            lineHeight: 20,
          }}
        >
          {t('odometer.description')}
        </Text>
      </Animated.View>

      {lastReading !== null && (
        <Animated.View
          entering={FadeInUp.delay(150).duration(300)}
          style={{
            backgroundColor: Colors.card,
            borderRadius: 12,
            borderCurve: 'continuous',
            padding: 14,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 13,
              color: Colors.textSecondary,
            }}
          >
            {t('odometer.lastReading')}{' '}
            <Text
              selectable
              style={{
                fontFamily: Fonts.semiBold,
                color: Colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {lastReading.toLocaleString()} {settings.distanceUnit}
            </Text>
          </Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.delay(200).duration(300)} style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: Fonts.semiBold,
            fontSize: 14,
            color: Colors.textPrimary,
          }}
        >
          {t('odometer.currentReading')}
        </Text>
        <TextInput
          value={reading}
          onChangeText={(txt) => {
            setReading(txt);
            setError('');
          }}
          placeholder={t('odometer.placeholder')}
          placeholderTextColor={Colors.textSecondary}
          keyboardType="numeric"
          style={{
            backgroundColor: Colors.surface,
            borderRadius: 12,
            borderCurve: 'continuous',
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontFamily: Fonts.semiBold,
            fontSize: 20,
            color: Colors.textPrimary,
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
          }}
          autoFocus
        />
        {error ? (
          <Text
            selectable
            style={{
              fontFamily: Fonts.regular,
              fontSize: 13,
              color: Colors.danger,
            }}
          >
            {error}
          </Text>
        ) : null}
      </Animated.View>

      <View style={{ gap: 10, marginTop: 'auto' }}>
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => ({
            backgroundColor: Colors.primary,
            borderRadius: 14,
            borderCurve: 'continuous',
            paddingVertical: 15,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' }}
          >
            {t('odometer.saveReading')}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => ({
            paddingVertical: 14,
            alignItems: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 15,
              color: Colors.textSecondary,
            }}
          >
            {t('odometer.skip')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
