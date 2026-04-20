import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

interface LegalDisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DisclaimerSection {
  heading: string;
  body: string;
}

const DISCLAIMER_SECTIONS: DisclaimerSection[] = [
  {
    heading: '1. No Professional Advice',
    body: 'MileageTrack is a mileage tracking utility designed to help users log and categorise vehicle trips. The app does not provide tax, legal, financial, or any other form of professional advice. Nothing within this app should be construed as professional guidance, and users should not rely on the app as a substitute for consulting with a qualified professional. Any decisions made based on the information provided by this app are made entirely at the user\u2019s own discretion and risk.',
  },
  {
    heading: '2. User Responsibility to Consult a Professional',
    body: 'Users are solely responsible for consulting a qualified tax professional, accountant, or the relevant state or country tax office regarding mileage deductions, business expense claims, and any tax-related matters. Tax laws and regulations vary by jurisdiction and are subject to change. The developer makes no representation that the app\u2019s features or output comply with any specific tax authority\u2019s requirements. Users should independently verify all information before using it for any tax filing or expense report.',
  },
  {
    heading: '3. User Responsibility for Trip Classification',
    body: 'The user is solely responsible for ensuring that all trips are correctly classified as Business or Personal. While MileageTrack may offer automatic classification based on time-of-day rules and user-configured business hours, this classification is an estimate only and may not accurately reflect the true nature of every trip. The user must review, verify, and correct trip classifications as needed. The developer accepts no liability for incorrect classifications or any consequences arising from them.',
  },
  {
    heading: '4. Data Loss and Backup Warning',
    body: 'The developer is not liable for any loss, corruption, or unavailability of tax records, trip records, odometer readings, or any other data stored in the app. Data may be lost due to device failure, software updates, operating system changes, app reinstallation, or other unforeseen circumstances. Users are strongly advised to regularly export their data and maintain independent backups of all records. The developer provides no data recovery service and assumes no responsibility for lost data.',
  },
  {
    heading: '5. Third Party Integrations',
    body: 'MileageTrack may utilise third-party services including, but not limited to, mapping providers, GPS location services, push notification services, and file sharing APIs. The developer is not responsible for the accuracy, reliability, availability, or performance of these third-party services. Service interruptions, data inaccuracies, or changes to third-party APIs may affect the functionality of the app without prior notice. The developer has no control over and accepts no liability for the actions or omissions of third-party service providers.',
  },
  {
    heading: '6. No Warranty',
    body: 'This app is provided on an "as is" and "as available" basis without any warranty of any kind, whether express, implied, statutory, or otherwise. The developer expressly disclaims all implied warranties including, without limitation, warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy. No warranty is made that the app will be uninterrupted, error-free, secure, or free from viruses or other harmful components.',
  },
  {
    heading: '7. Limitation of Liability',
    body: 'To the maximum extent permitted by applicable law, the developer shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or in connection with the use of, inability to use, or reliance upon this app, even if the developer has been advised of the possibility of such damages. This includes, without limitation, damages for loss of profits, data, business opportunities, goodwill, or any other intangible losses. In jurisdictions that do not allow the exclusion or limitation of certain damages, the developer\u2019s liability shall be limited to the maximum extent permitted by law.',
  },
  {
    heading: '8. Use at Own Risk',
    body: 'Use of MileageTrack is entirely at the user\u2019s own risk. The user acknowledges and agrees that the developer shall have no liability whatsoever for any damages, losses, or injuries arising from the use of, or inability to use, the app. The user assumes full responsibility for any and all consequences resulting from their use of the app, including any reliance on information or data provided by the app.',
  },
  {
    heading: '9. Third Party Consent',
    body: 'By downloading, installing, and using MileageTrack, the user consents to the use of third-party services as described herein. This includes the transmission of location data and other information to third-party mapping and geolocation service providers as necessary for the app\u2019s core functionality. Users who do not consent to the use of these services should not use the app.',
  },
  {
    heading: '10. Accuracy of Information',
    body: 'The developer does not guarantee the accuracy, completeness, or timeliness of any information displayed in the app. Information including but not limited to trip distances, durations, suburb names, odometer calculations, and financial year summaries may contain errors or inaccuracies. Users should not rely on this information as the sole basis for any decision and should independently verify all data before use in official records or filings.',
  },
  {
    heading: '11. Accuracy of Mileage',
    body: 'Mileage figures displayed in the app are estimates based on GPS data and optional odometer calibration. Due to the inherent limitations of GPS technology and the variability of driving routes, actual distances travelled may differ from those recorded by the app. The developer makes no guarantee that mileage figures are accurate and accepts no liability for discrepancies between recorded and actual distances.',
  },
  {
    heading: '12. Accuracy of Sensors',
    body: 'MileageTrack relies on the device\u2019s built-in GPS receiver, motion sensors, and other hardware components to detect movement and calculate distances. The accuracy of these sensors varies significantly between device manufacturers, models, and hardware generations. Environmental conditions, device age, battery level, and software configuration may also affect sensor performance. The developer has no control over and accepts no responsibility for the accuracy or reliability of device sensors.',
  },
  {
    heading: '13. No Guarantee of GPS Accuracy',
    body: 'GPS accuracy can be affected by numerous environmental and technical factors including but not limited to atmospheric conditions, satellite geometry, signal blockage by buildings or terrain, electromagnetic interference, device hardware quality, and operating system software limitations. The developer makes no guarantee whatsoever regarding the precision, accuracy, or availability of GPS positioning data. Users should be aware that GPS-derived distances and locations are approximations only.',
  },
  {
    heading: '14. Device Not Used as a Medical Device',
    body: 'This app is not intended to be used as a medical device, health monitoring tool, or for any medical purpose whatsoever. The app should not be used to diagnose, treat, cure, or prevent any medical condition. No information or functionality provided by the app should be interpreted as medical advice. Users with medical concerns should consult a qualified healthcare professional.',
  },
  {
    heading: '15. Explicit Consent to Tracking',
    body: 'By using MileageTrack, the user explicitly consents to background GPS location tracking for the purpose of automatic trip detection and distance recording. The app may access the device\u2019s location services while running in the background to detect when a trip begins and ends. Users who do not wish to have their location tracked should disable location permissions for this app in their device settings or uninstall the app.',
  },
  {
    heading: '16. Private and Business Boundary with Trip Tracking',
    body: 'MileageTrack records all detected trips regardless of their classification as Business or Personal. The app does not automatically distinguish between private and business travel with certainty. The user is solely responsible for reviewing all recorded trips and correcting their classifications to maintain an accurate separation of private and business travel. The developer accepts no liability for any failure to correctly separate private and business trips or any consequences arising from such failure.',
  },
  {
    heading: '17. App Does Not Share Data with Third Parties',
    body: 'All trip data, location data, odometer readings, personal information, and any other data entered into or recorded by MileageTrack is stored locally on the user\u2019s device. The developer does not collect, transmit, or share any user data with third parties. The developer does not operate any servers that receive or store user data. Users are responsible for the security of their own device and the data stored on it. If a user chooses to export or share their data via the app\u2019s export functionality, they do so at their own discretion and risk.',
  },
];

export function LegalDisclaimerModal({ visible, onClose }: LegalDisclaimerModalProps) {
  const insets = useSafeAreaInsets();

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
              Legal Disclaimer
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              Please read carefully before using the app
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
              By using MileageTrack, you acknowledge that you have read, understood, and agree to be bound by the following terms and conditions. If you do not agree with any part of this disclaimer, please discontinue use of the app immediately.
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
              This disclaimer was last updated on April 20, 2026. The developer reserves the right to update or modify this disclaimer at any time without prior notice.
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
              Close
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
