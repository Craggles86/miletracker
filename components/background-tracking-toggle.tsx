/**
 * Settings row that enables/disables the background GPS foreground service.
 *
 * Permission requests only fire when the user taps the toggle — never at app
 * startup. All native calls are wrapped in try/catch inside
 * `utils/background-tracking.ts` so a failure cannot crash the app.
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import {
  disableBackgroundTracking,
  enableBackgroundTracking,
  isBackgroundTrackingActive,
  wasBackgroundTrackingEnabled,
} from '@/utils/background-tracking';

function showAlert(title: string, message: string, onOpenSettings?: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  const buttons: {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel';
  }[] = [{ text: 'OK', style: 'default' }];
  if (onOpenSettings) {
    buttons.unshift({ text: 'Open settings', onPress: onOpenSettings });
  }
  Alert.alert(title, message, buttons);
}

export function BackgroundTrackingToggle() {
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);
  const [ready, setReady] = useState(false);

  // Determine initial toggle state on mount — derived from the live service
  // status, falling back to the persisted "enabled" flag.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isBackgroundTrackingActive()) {
          if (!cancelled) setEnabled(true);
        } else {
          const persisted = await wasBackgroundTrackingEnabled();
          if (!cancelled) setEnabled(persisted);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = useCallback(
    async (next: boolean) => {
      if (working) return;
      setWorking(true);
      try {
        if (next) {
          if (Platform.OS === 'web') {
            showAlert(
              'Not supported on web',
              'Background trip tracking is only available on the iOS and Android apps.'
            );
            return;
          }
          const res = await enableBackgroundTracking();
          if (res.ok) {
            setEnabled(true);
          } else if (res.reason === 'permission') {
            showAlert(
              'Permission required',
              Platform.OS === 'ios'
                ? 'To auto-detect trips, allow location access “Always” in Settings.'
                : 'To auto-detect trips, allow location access “All the time” and notifications in Settings.',
              () => {
                Linking.openSettings().catch(() => {});
              }
            );
            setEnabled(false);
          } else if (res.reason === 'unsupported') {
            showAlert(
              'Not available',
              'Background trip tracking is not available on this device.'
            );
          } else {
            showAlert(
              'Couldn’t enable tracking',
              'Something went wrong starting the background location service. Please try again.'
            );
          }
        } else {
          await disableBackgroundTracking();
          setEnabled(false);
        }
      } catch (err) {
        console.warn('[BackgroundTrackingToggle] toggle failed', err);
      } finally {
        setWorking(false);
      }
    },
    [working]
  );

  return (
    <View
      style={{
        backgroundColor: Colors.card,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 16,
        borderWidth: 1,
        borderColor: enabled ? `${Colors.accent}60` : Colors.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${Colors.accent}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="sparkles" size={18} color={Colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 15,
              color: Colors.textPrimary,
            }}
          >
            Auto-Detect Trips
          </Text>
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 12,
              color: Colors.textSecondary,
            }}
          >
            Starts a trip when you drive, ends after 5 min stopped.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={!ready || working || Platform.OS === 'web'}
          trackColor={{ false: Colors.surface, true: Colors.accent }}
          thumbColor="#fff"
        />
      </View>
      <Text
        style={{
          fontFamily: Fonts.regular,
          fontSize: 12,
          color: Colors.textSecondary,
          lineHeight: 17,
        }}
      >
        {Platform.OS === 'web'
          ? 'Open MileageTrack on your phone to enable background trip detection.'
          : enabled
          ? 'Tracking in the background. Detected trips will appear in your trip list automatically.'
          : 'Requires “Always” location permission. A persistent notification keeps tracking active.'}
      </Text>
    </View>
  );
}
