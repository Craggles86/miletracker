import { Stack } from 'expo-router/stack';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/i18n/useTranslation';

export default function TripsLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerTitle: t('trips.detailTitle'),
          headerBackTitle: t('tabs.trips'),
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
