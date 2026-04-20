import { useRef, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import type { LatLng } from '@/store/types';

interface RouteMapPreviewProps {
  routePoints: LatLng[];
  height?: number;
  startSuburb?: string;
  endSuburb?: string;
}

const API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9ab5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#b0bec5' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7a8da6' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e3a2f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#5b8a72' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3e5a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4f6e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0bec5' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#243352' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#7a8da6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5d78' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0e1626' }] },
];

// Singleton: load the Google Maps JS API script once
let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function RouteMapPreview({
  routePoints,
  height = 220,
  startSuburb,
  endSuburb,
}: RouteMapPreviewProps) {
  const containerRef = useRef<View>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Load the Maps API
  useEffect(() => {
    if (routePoints.length < 2) return;
    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [routePoints.length]);

  // Initialize the map once the API is ready
  useEffect(() => {
    if (status !== 'ready' || routePoints.length < 2) return;

    // In react-native-web, a View ref resolves to the underlying DOM element
    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    // Create a dedicated div for Google Maps so React doesn't interfere
    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;z-index:0;';
    container.appendChild(mapDiv);
    mapDivRef.current = mapDiv;

    const g = (window as any).google;
    const coords = routePoints.map((p) => new g.maps.LatLng(p.lat, p.lng));

    const map = new g.maps.Map(mapDiv, {
      disableDefaultUI: true,
      gestureHandling: 'none',
      keyboardShortcuts: false,
      styles: DARK_MAP_STYLE,
      backgroundColor: '#1a2744',
    });

    // Fit to route bounds with padding
    const bounds = new g.maps.LatLngBounds();
    coords.forEach((c: any) => bounds.extend(c));
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 50, left: 40 });

    // Glow polyline (wider, semi-transparent)
    new g.maps.Polyline({
      path: coords,
      strokeColor: Colors.primary,
      strokeOpacity: 0.25,
      strokeWeight: 8,
      map,
    });

    // Main polyline
    new g.maps.Polyline({
      path: coords,
      strokeColor: Colors.primary,
      strokeOpacity: 1,
      strokeWeight: 4,
      map,
    });

    // Start marker
    new g.maps.Marker({
      position: coords[0],
      map,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: Colors.accent,
        fillOpacity: 1,
        strokeWeight: 2.5,
        strokeColor: '#ffffff',
      },
    });

    // End marker
    new g.maps.Marker({
      position: coords[coords.length - 1],
      map,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: Colors.danger,
        fillOpacity: 1,
        strokeWeight: 2.5,
        strokeColor: '#ffffff',
      },
    });

    return () => {
      if (mapDivRef.current && container.contains(mapDivRef.current)) {
        container.removeChild(mapDivRef.current);
      }
      mapDivRef.current = null;
    };
  }, [status, routePoints]);

  if (routePoints.length < 2) {
    return (
      <View
        style={{
          height,
          backgroundColor: Colors.card,
          borderRadius: 16,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: Colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 14,
            color: Colors.textSecondary,
          }}
        >
          No route data available
        </Text>
      </View>
    );
  }

  return (
    <View
      ref={containerRef}
      style={{
        height,
        backgroundColor: Colors.card,
        borderRadius: 16,
        borderCurve: 'continuous',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      {/* Loading overlay */}
      {status === 'loading' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.card,
            zIndex: 10,
          }}
        >
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 12,
              color: Colors.textSecondary,
              marginTop: 8,
            }}
          >
            Loading map...
          </Text>
        </View>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.card,
            zIndex: 10,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 14,
              color: Colors.textSecondary,
            }}
          >
            Map unavailable
          </Text>
        </View>
      )}

      {/* Suburb labels */}
      {(startSuburb || endSuburb) && (
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            left: 12,
            right: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            zIndex: 5,
          }}
        >
          {startSuburb ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                borderCurve: 'continuous',
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: Colors.accent,
                }}
              />
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  color: Colors.textSecondary,
                }}
              >
                {startSuburb}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {endSuburb ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                borderCurve: 'continuous',
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: Colors.danger,
                }}
              />
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  color: Colors.textSecondary,
                }}
              >
                {endSuburb}
              </Text>
            </View>
          ) : (
            <View />
          )}
        </View>
      )}
    </View>
  );
}
