import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const setup = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch {
        // Silently fail — notifications are non-critical
      }
    };
    setup();
  }, []);

  const notifyTripStarted = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Trip Started',
          body: 'MileageTrack is logging your journey',
        },
        trigger: null,
      });
    } catch {
      // Non-critical
    }
  }, []);

  const notifyTripEnded = useCallback(async (distanceStr: string) => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Trip Ended',
          body: `${distanceStr} logged`,
        },
        trigger: null,
      });
    } catch {
      // Non-critical
    }
  }, []);

  return { notifyTripStarted, notifyTripEnded };
}
