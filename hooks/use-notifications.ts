import { useCallback } from 'react';

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
          title: 'Trip started',
          body: 'MileageTrack is logging your journey',
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
          title: 'Trip ended',
          body: `${distanceKm.toFixed(1)} km logged`,
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
          title: 'Weekly odometer check',
          body: 'Time to record your odometer reading for accurate mileage',
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
