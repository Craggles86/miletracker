import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FontMap } from '@/constants/Typography';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { InteractionManager, Platform } from 'react-native';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { DisclaimerGate } from '@/components/disclaimer-gate';
import { ErrorBoundary } from '@/components/error-boundary';
import { initialiseI18n, getDeviceRegionCode, getDefaultDistanceUnitForRegion } from '@/i18n';
import { notifyLocaleChange } from '@/i18n/useTranslation';
import { useAppStore } from '@/store/useAppStore';

console.log('[RootLayout] module loading');

// Detect locale as early as possible (before first render) so every string is
// localised on first paint. Failures are swallowed so they can never crash.
try {
  initialiseI18n();
  notifyLocaleChange();
  console.log('[RootLayout] i18n initialised');
} catch (err) {
  console.warn('[RootLayout] i18n init failed (using English)', err);
}

// Prevent the splash screen auto-hiding before fonts load. Guarded because
// preventAutoHideAsync can throw after fast refresh or if splash is already
// dismissed — a throw here would crash the app before any UI mounts.
try {
  SplashScreen.preventAutoHideAsync();
  console.log('[RootLayout] splash screen held');
} catch {
  // ignore
}

const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.card,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.accent,
  },
};

export default function RootLayout() {
  console.log('[RootLayout] render start');
  const [loaded, error] = useFonts(FontMap);

  useEffect(() => {
    if (loaded) {
      console.log('[RootLayout] fonts loaded successfully');
    }
    if (error) {
      console.warn('[RootLayout] font loading error:', error);
    }
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  // On first launch (when the user hasn't manually set a unit preference), pick
  // a sensible default distance unit based on the device's region. US/UK/MM use
  // miles; everywhere else uses kilometres. We only do this once by watching
  // the `distanceUnitAutoDetected` flag in persisted state.
  useEffect(() => {
    if (!loaded && !error) return;
    try {
      const state = useAppStore.getState();
      if (!state.settings.distanceUnitAutoDetected) {
        const region = getDeviceRegionCode();
        const defaultUnit = getDefaultDistanceUnitForRegion(region);
        state.updateSettings({
          distanceUnit: defaultUnit,
          distanceUnitAutoDetected: true,
        });
        console.log('[RootLayout] distance unit set to', defaultUnit, 'for region', region);
      }
    } catch (err) {
      console.warn('[RootLayout] distance unit auto-detect failed', err);
    }
  }, [loaded, error]);

  // Defer non-critical initialisation (notifications config) until after the
  // first render + interactions. This keeps the startup path bare-bones so a
  // failure in an optional native module can't crash the app on launch.
  useEffect(() => {
    if (!loaded && !error) return;
    // Skip notifications setup entirely on web
    if (Platform.OS === 'web') return;

    const handle = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          console.log('[RootLayout] configuring notifications (deferred)');
          const { configureNotifications } = await import(
            '@/utils/notifications-config'
          );
          await configureNotifications();
          console.log('[RootLayout] notifications configured');
        } catch (err) {
          console.warn('[RootLayout] notifications config failed', err);
        }
      })();
    });

    return () => {
      try {
        handle.cancel?.();
      } catch {
        // ignore
      }
    };
  }, [loaded, error]);

  if (!loaded && !error) {
    console.log('[RootLayout] waiting for fonts...');
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider value={appTheme}>
            <StatusBar style="light" />
            <DisclaimerGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="odometer-modal"
                  options={{
                    presentation: 'formSheet',
                    headerShown: false,
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.55, 0.75],
                  }}
                />
              </Stack>
            </DisclaimerGate>
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
