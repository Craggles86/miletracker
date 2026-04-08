import { Stack } from 'expo-router/stack';
import { Colors } from '@/constants/Colors';

export default function TripsLayout() {
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
          headerTitle: 'Trip Detail',
          headerBackTitle: 'Trips',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
