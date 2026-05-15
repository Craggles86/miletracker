import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoutePoint } from '@/store/types';
import { colors, spacing, typography } from '@/constants/theme';

interface RouteMapPreviewProps {
  routePoints: RoutePoint[];
  width: number;
  height: number;
}

export function RouteMapPreview({ routePoints, width, height }: RouteMapPreviewProps) {
  const pointCount = routePoints.length;

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.iconRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="navigate" size={24} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.label}>Route Recorded</Text>
      <Text style={styles.detail}>{pointCount} GPS point{pointCount !== 1 ? 's' : ''} captured</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  iconRow: {
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  detail: {
    ...typography.callout,
    color: colors.textSecondary,
  },
});
