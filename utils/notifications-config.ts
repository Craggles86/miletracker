/**
 * Configures expo-notifications so trip-start / trip-end alerts are shown
 * even when the app is in the foreground. Safe on web — lazy-loads the
 * module and swallows failures.
 */

import { Platform } from 'react-native';

let _configured = false;

export function configureNotifications(): void {
  if (_configured) return;
  _configured = true;

  // Fire-and-forget — we never need to await this from the UI.
  (async () => {
    try {
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
        await Notifications.setNotificationChannelAsync('mileagetrack-trips', {
          name: 'Trip tracking',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: false,
        });
      }
    } catch {
      // Notifications aren't available (web, or user denied) — ignore.
    }
  })();
}
