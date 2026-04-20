import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FontMap } from '@/constants/Typography';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { DisclaimerGate } from '@/components/disclaimer-gate';
import { ErrorBoundary } from '@/components/error-boundary';
// Side-effect import: defines the background location task before the OS
// delivers any deferred task events (required when the app is relaunched
// by the OS for a background location update).
import '@/utils/background-location-task';
import { configureNotifications } from '@/utils/notifications-config';

// Any init that runs at module load must be guarded — an uncaught exception
// here would crash the app before any UI has a chance to render.
try {
  configureNotifications();
} catch {
  // Notifications aren't critical to app start — swallow.
}

try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // preventAutoHideAsync can throw if the splash was already hidden
  // (e.g. fast refresh). Safe to ignore.
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
      SplashScreen.hideAsync().catch(() => {
        // hideAsync can throw if splash was already dismissed
      });
    }
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
