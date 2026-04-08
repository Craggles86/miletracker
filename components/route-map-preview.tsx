import { View, Text } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { normalizeRouteToSvg } from '@/utils/helpers';
import type { LatLng } from '@/store/types';

interface RouteMapPreviewProps {
  routePoints: LatLng[];
  height?: number;
  startSuburb?: string;
  endSuburb?: string;
}

export function RouteMapPreview({
  routePoints,
  height = 220,
  startSuburb,
  endSuburb,
}: RouteMapPreviewProps) {
  const width = 1000; // SVG internal width — scales to container
  const svgHeight = (height / 200) * 600; // proportional

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

  const svgPoints = normalizeRouteToSvg(routePoints, width, svgHeight, 60);
  const polylineStr = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const startPt = svgPoints[0];
  const endPt = svgPoints[svgPoints.length - 1];

  return (
    <View
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
      {/* Subtle grid pattern background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.04,
          backgroundColor: Colors.primary,
        }}
      />

      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Route line - thicker with semi-transparent duplicate for glow */}
        <Polyline
          points={polylineStr}
          fill="none"
          stroke={`${Colors.primary}40`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points={polylineStr}
          fill="none"
          stroke={Colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Start marker */}
        <Circle cx={startPt.x} cy={startPt.y} r="14" fill={`${Colors.accent}30`} />
        <Circle cx={startPt.x} cy={startPt.y} r="8" fill={Colors.accent} />

        {/* End marker */}
        <Circle cx={endPt.x} cy={endPt.y} r="14" fill={`${Colors.danger}30`} />
        <Circle cx={endPt.x} cy={endPt.y} r="8" fill={Colors.danger} />
      </Svg>

      {/* Labels */}
      {(startSuburb || endSuburb) && (
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            left: 12,
            right: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {startSuburb && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: `${Colors.background}CC`,
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
          )}
          {endSuburb && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: `${Colors.background}CC`,
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
          )}
        </View>
      )}
    </View>
  );
}
