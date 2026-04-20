import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FontMap } from '@/constants/Typography';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import { DisclaimerGate } from '@/components/disclaimer-gate';
// Side-effect import: defines the background location task before the OS
// delivers any deferred task events (required when the app is relaunched
// by the OS for a background location update).
import '@/utils/background-location-task';
import { configureNotifications } from '@/utils/notifications-config';

configureNotifications();

SplashScreen.preventAutoHideAsync();

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
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
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
  );
}
