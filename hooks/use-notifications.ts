import { useEffect, useCallback, useRef } from 'react';
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

// Persistent notification identifier for monitoring state
const MONITORING_NOTIFICATION_ID = 'mileagetrack-monitoring';

export function useNotifications() {
  const isMonitoringRef = useRef(false);

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

  const showMonitoringNotification = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (isMonitoringRef.current) return;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: MONITORING_NOTIFICATION_ID,
        content: {
          title: 'MileageTrack Active',
          body: 'Monitoring for trips — auto-detection is on',
          sticky: false, // user-dismissible
          autoDismiss: false,
        },
        trigger: null,
      });
      isMonitoringRef.current = true;
    } catch {
      // Non-critical — auto-detect still works without the notification
    }
  }, []);

  const dismissMonitoringNotification = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!isMonitoringRef.current) return;

    try {
      await Notifications.dismissNotificationAsync(MONITORING_NOTIFICATION_ID);
      isMonitoringRef.current = false;
    } catch {
      isMonitoringRef.current = false;
    }
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

  return {
    notifyTripStarted,
    notifyTripEnded,
    showMonitoringNotification,
    dismissMonitoringNotification,
  };
}
