import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { DISCLAIMER_SECTIONS } from '@/constants/disclaimer-sections';
import { useTranslation } from '@/i18n/useTranslation';

const STORAGE_KEY = 'mileagetrack-disclaimer-accepted';

interface DisclaimerGateProps {
  children: ReactNode;
}

export function DisclaimerGate({ children }: DisclaimerGateProps) {
  const [status, setStatus] = useState<'loading' | 'required' | 'accepted'>('loading');
  const [agreed, setAgreed] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        setStatus(value === 'true' ? 'accepted' : 'required');
      })
      .catch(() => {
        setStatus('required');
      });
  }, []);

  const handleAccept = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setStatus('accepted');
    } catch {
      // If storage fails, still let the user in for this session
      setStatus('accepted');
    }
  }, []);

  // Still loading acceptance status — show nothing (splash screen is still visible)
  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Already accepted — render app content
  if (status === 'accepted') {
    return <>{children}</>;
  }

  // First launch — show full-screen disclaimer gate
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Fixed header */}
      <Animated.View
        entering={FadeIn.duration(500)}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 14,
          paddingHorizontal: 20,
          backgroundColor: Colors.card,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              borderCurve: 'continuous',
              backgroundColor: `${Colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
          </View>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 20,
              color: Colors.textPrimary,
            }}
          >
            {t('disclaimer.title')}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 13,
            color: Colors.textSecondary,
            lineHeight: 18,
          }}
        >
          {t('disclaimer.subtitleGate')}
        </Text>
      </Animated.View>

      {/* Scrollable disclaimer body */}
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 24,
          gap: 24,
        }}
        showsVerticalScrollIndicator
      >
        {/* Preamble */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          style={{
            backgroundColor: `${Colors.primary}10`,
            borderRadius: 12,
            borderCurve: 'continuous',
            padding: 14,
            borderLeftWidth: 3,
            borderLeftColor: Colors.primary,
          }}
        >
          <Text
            selectable
            style={{
              fontFamily: Fonts.medium,
              fontSize: 13,
              color: Colors.textSecondary,
              lineHeight: 20,
            }}
          >
            {t('disclaimer.preamble')}
          </Text>
        </Animated.View>

        {/* Disclaimer sections */}
        {DISCLAIMER_SECTIONS.map((section, index) => (
          <View key={index} style={{ gap: 8 }}>
            <Text
              selectable
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 15,
                color: Colors.textPrimary,
                lineHeight: 22,
              }}
            >
              {section.heading}
            </Text>
            <Text
              selectable
              style={{
                fontFamily: Fonts.regular,
                fontSize: 14,
                color: Colors.textSecondary,
                lineHeight: 22,
              }}
            >
              {section.body}
            </Text>
          </View>
        ))}

        {/* Footer date */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingTop: 16,
            marginTop: 8,
          }}
        >
          <Text
            selectable
            style={{
              fontFamily: Fonts.regular,
              fontSize: 12,
              color: Colors.textSecondary,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            {t('disclaimer.footerNote')}
          </Text>
        </View>
      </ScrollView>

      {/* Fixed bottom: checkbox + accept button */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={{
          paddingTop: 12,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 20,
          paddingHorizontal: 20,
          backgroundColor: Colors.card,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          gap: 14,
        }}
      >
        {/* Checkbox row */}
        <Pressable
          onPress={() => setAgreed((prev) => !prev)}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderCurve: 'continuous',
              borderWidth: 2,
              borderColor: agreed ? Colors.primary : Colors.textSecondary,
              backgroundColor: agreed ? Colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            {agreed && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: Fonts.medium,
              fontSize: 14,
              color: Colors.textPrimary,
              lineHeight: 20,
            }}
          >
            {t('disclaimer.agree')}
          </Text>
        </Pressable>

        {/* Accept button */}
        <Pressable
          onPress={handleAccept}
          disabled={!agreed}
          style={({ pressed }) => ({
            backgroundColor: agreed ? Colors.primary : Colors.surface,
            borderRadius: 12,
            borderCurve: 'continuous',
            paddingVertical: 16,
            alignItems: 'center',
            opacity: agreed ? (pressed ? 0.8 : 1) : 0.5,
          })}
        >
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 16,
              color: agreed ? '#fff' : Colors.textSecondary,
            }}
          >
            {t('disclaimer.accept')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
