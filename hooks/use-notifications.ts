import { useCallback } from 'react';
import { t } from '@/i18n/useTranslation';

// Lazy-load expo-notifications to avoid web crashes
async function getNotifications() {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export function useNotifications() {
  const requestPermissions = useCallback(async () => {
    const Notifications = await getNotifications();
    if (!Notifications) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  const notifyTripStarted = useCallback(async () => {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.tripStartedTitle'),
          body: t('notifications.tripStartedBody'),
          sound: false,
        },
        trigger: null, // fire immediately
      });
    } catch {
      // Notifications may not be available
    }
  }, []);

  const notifyTripEnded = useCallback(async (distanceKm: number) => {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.tripEndedTitle'),
          body: t('notifications.tripEndedBody', {
            distance: `${distanceKm.toFixed(1)} km`,
          }),
          sound: false,
        },
        trigger: null,
      });
    } catch {
      // Notifications may not be available
    }
  }, []);

  const notifyOdometerPrompt = useCallback(async () => {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.odoPromptTitle'),
          body: t('notifications.odoPromptBody'),
          sound: true,
        },
        trigger: null,
      });
    } catch {
      // Notifications may not be available
    }
  }, []);

  return {
    requestPermissions,
    notifyTripStarted,
    notifyTripEnded,
    notifyOdometerPrompt,
  };
}
