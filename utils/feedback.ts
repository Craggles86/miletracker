import { Alert, Platform } from 'react-native';
import { t } from '@/i18n/useTranslation';

// Recipient is hardcoded here and never exposed in the UI. Only the fallback
// alert reveals the address — and only if no mail app is configured.
const FEEDBACK_EMAIL = 'craig.lindeman@outlook.com';
const FEEDBACK_SUBJECT = 'MileageTrack Feedback';

function showNoEmailAlert() {
  const title = t('settings.noEmailAppTitle');
  const message = t('settings.noEmailAppMessage');
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message, [{ text: t('common.ok'), style: 'default' }]);
}

/**
 * Opens the device's native email composer pre-filled with the feedback
 * recipient, a default subject, and an empty body for the user to type
 * their feedback. When no email client is available we show a friendly
 * alert so the user still knows how to reach us.
 *
 * The recipient address is intentionally hardcoded here and never rendered
 * in the UI — only the no-client fallback message reveals it.
 */
export async function sendFeedbackEmail(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // expo-mail-composer is a no-op on web. Fall back to a mailto: link so
      // the user's default mail handler still has a chance to open.
      if (typeof window !== 'undefined') {
        const subject = encodeURIComponent(FEEDBACK_SUBJECT);
        const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}`;
        window.location.href = url;
      }
      return;
    }

    const MailComposer = await import('expo-mail-composer');
    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      showNoEmailAlert();
      return;
    }
    await MailComposer.composeAsync({
      recipients: [FEEDBACK_EMAIL],
      subject: FEEDBACK_SUBJECT,
      body: '',
      isHtml: false,
    });
  } catch (err) {
    console.warn('[feedback] failed to open mail composer', err);
    showNoEmailAlert();
  }
}
