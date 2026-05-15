import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OdometerModal } from '@/components/odometer-modal';
import { useAppStore } from '@/store/app-store';
import { colors } from '@/constants/theme';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const hasAcceptedTerms = useAppStore((s) => s.settings.hasAcceptedTerms);
  const hasCheckedInitial = useRef(false);

  useEffect(() => {
    // Only redirect to legal on initial load if terms haven't been accepted
    if (!hasAcceptedTerms && segments[0] !== 'legal') {
      router.replace('/legal');
    }

    // After initial check, mark as done so we don't interfere with
    // intentional navigation to legal from settings
    if (!hasCheckedInitial.current) {
      hasCheckedInitial.current = true;
    }
  }, [hasAcceptedTerms, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="legal"
              options={{
                headerShown: false,
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="trip/[id]"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.textPrimary,
                headerTitle: 'Trip Details',
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
          </Stack>
        </NavigationGuard>
        <OdometerModal />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
