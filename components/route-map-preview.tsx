import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoutePoint } from '@/store/types';
import { colors, spacing, typography } from '@/constants/theme';

interface RouteMapPreviewProps {
  routePoints: RoutePoint[];
  width: number;
  height: number;
}

// Map component only available on native
let MapView: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Polyline = Maps.Polyline;
  } catch {
    // Maps not available
  }
}

export function RouteMapPreview({ routePoints, width, height }: RouteMapPreviewProps) {
  const region = useMemo(() => {
    if (routePoints.length === 0) return null;

    let minLat = routePoints[0].lat;
    let maxLat = routePoints[0].lat;
    let minLng = routePoints[0].lng;
    let maxLng = routePoints[0].lng;

    for (const p of routePoints) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }

    const latDelta = Math.max((maxLat - minLat) * 1.3, 0.01);
    const lngDelta = Math.max((maxLng - minLng) * 1.3, 0.01);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [routePoints]);

  const coordinates = useMemo(
    () => routePoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [routePoints]
  );

  // Fallback for web or when no route points
  if (!MapView || !region || routePoints.length < 2) {
    return (
      <View style={[styles.fallback, { width, height }]}>
        <Ionicons name="map-outline" size={40} color={colors.textMuted} />
        <Text style={styles.fallbackText}>
          {routePoints.length < 2 ? 'Not enough GPS data' : 'Map preview'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.mapContainer, { width, height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle="dark"
        customMapStyle={darkMapStyle}
      >
        <Polyline
          coordinates={coordinates}
          strokeColor={colors.primary}
          strokeWidth={4}
        />
      </MapView>
    </View>
  );
}

// Dark mode map style for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  mapContainer: {
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  fallback: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fallbackText: {
    ...typography.callout,
    color: colors.textMuted,
  },
});
