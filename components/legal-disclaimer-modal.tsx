import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { DISCLAIMER_SECTIONS } from '@/constants/disclaimer-sections';
import { useTranslation } from '@/i18n/useTranslation';

interface LegalDisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LegalDisclaimerModal({ visible, onClose }: LegalDisclaimerModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
        }}
      >
        {/* Header bar */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 20,
            backgroundColor: Colors.card,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 18,
                color: Colors.textPrimary,
              }}
            >
              {t('disclaimer.title')}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              {t('disclaimer.subtitleModal')}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 32,
            gap: 24,
          }}
          showsVerticalScrollIndicator
        >
          {/* Preamble */}
          <View
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
          </View>

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

          {/* Footer note */}
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

          {/* Close button at bottom */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: Colors.primary,
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingVertical: 14,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
              marginTop: 4,
            })}
          >
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 16,
                color: '#fff',
              }}
            >
              {t('common.close')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
