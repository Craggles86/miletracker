/**
 * Background Location Task Definition
 *
 * CRITICAL: This file MUST be imported before any React code.
 * It only contains the TaskManager.defineTask call.
 * No React imports, no hooks, no components.
 */
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_LOCATION_TASK = 'background-location-tracking';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocation] Task error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Array<{ coords: { latitude: number; longitude: number; speed: number | null }; timestamp: number }> };
    if (locations && locations.length > 0) {
      // Import store dynamically to avoid circular deps
      const { useAppStore } = require('../store/app-store');
      const store = useAppStore.getState();
      store.processLocationUpdate(locations);
    }
  }
});
