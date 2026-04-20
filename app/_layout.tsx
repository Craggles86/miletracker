import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FontMap } from '@/constants/Typography';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { DisclaimerGate } from '@/components/disclaimer-gate';
import { ErrorBoundary } from '@/components/error-boundary';

// Prevent the splash screen auto-hiding before fonts load. Guarded because
// preventAutoHideAsync can throw after fast refresh or if splash is already
// dismissed — a throw here would crash the app before any UI mounts.
try {
  SplashScreen.preventAutoHideAsync();
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
  const [loaded, error] = useFonts(FontMap);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  // Defer non-critical initialisation (notifications config) until after the
  // first render + interactions. This keeps the startup path bare-bones so a
  // failure in an optional native module can't crash the app on launch.
  useEffect(() => {
    if (!loaded && !error) return;

    const handle = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const { configureNotifications } = await import(
            '@/utils/notifications-config'
          );
          configureNotifications();
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
