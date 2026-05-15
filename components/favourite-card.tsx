import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FavouriteLocation } from '@/store/types';
import { colors, spacing, radius, typography } from '@/constants/theme';

interface FavouriteCardProps {
  favourite: FavouriteLocation;
  onDelete?: () => void;
}

const LABEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Work: 'briefcase',
};

export function FavouriteCard({ favourite, onDelete }: FavouriteCardProps) {
  const icon = LABEL_ICONS[favourite.label] || 'location';
  const iconColor = favourite.label === 'Home' ? colors.accent : favourite.label === 'Work' ? colors.primary : colors.warning;

  return (
    <View style={styles.card}>
      <View style={[styles.iconBg, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{favourite.label}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {favourite.suburb || favourite.address}
        </Text>
      </View>
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderCurve: 'continuous',
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  address: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
});
