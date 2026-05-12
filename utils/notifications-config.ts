/**
 * Configures expo-notifications so trip-start / trip-end alerts are shown
 * even when the app is in the foreground. Safe on web — lazy-loads the
 * module and swallows failures.
 *
 * IMPORTANT: This must NEVER run at module-evaluation time. It is called
 * from _layout.tsx via InteractionManager.runAfterInteractions() so any
 * native crash here can't prevent the app from launching.
 */

import { Platform } from 'react-native';
import { t } from '@/i18n/useTranslation';

let _configured = false;

export async function configureNotifications(): Promise<void> {
  if (_configured) return;
  if (Platform.OS === 'web') return;
  _configured = true;

  try {
    console.log('[notifications] configuring...');
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('mileagetrack-trips', {
          name: t('notifications.channelName'),
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: false,
        });
        console.log('[notifications] trip channel created');
      } catch (channelErr) {
        console.warn('[notifications] channel creation failed:', channelErr);
      }
    }
    console.log('[notifications] configuration complete');
  } catch (err) {
    console.warn('[notifications] setup failed (safe to ignore):', err);
  }
}
