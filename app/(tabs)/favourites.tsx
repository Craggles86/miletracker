import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { FavouriteCard } from '@/components/favourite-card';
import { FavouriteLocation } from '@/store/types';
import { colors, spacing, radius, typography } from '@/constants/theme';

export default function FavouritesScreen() {
  const insets = useSafeAreaInsets();
  const favourites = useAppStore((s) => s.favourites);
  const addFavourite = useAppStore((s) => s.addFavourite);
  const deleteFavourite = useAppStore((s) => s.deleteFavourite);

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');

  const handleAdd = () => {
    if (!label.trim() || !suburb.trim()) {
      Alert.alert('Missing Info', 'Please enter a label and suburb.');
      return;
    }
    addFavourite({
      label: label.trim(),
      address: address.trim(),
      suburb: suburb.trim(),
      lat: 0, // Would use geocoding in production
      lng: 0,
    });
    setLabel('');
    setAddress('');
    setSuburb('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Favourite', 'Remove this favourite location?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFavourite(id) },
    ]);
  };

  const renderItem = ({ item, index }: { item: FavouriteLocation; index: number }) => (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
      <Swipeable
        renderRightActions={() => (
          <Pressable style={styles.deleteAction} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash" size={22} color="#FFFFFF" />
          </Pressable>
        )}
        overshootRight={false}
      >
        <FavouriteCard favourite={item} onDelete={() => handleDelete(item.id)} />
      </Swipeable>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerRow}>
          <Text style={styles.title}>Favourites</Text>
          <Pressable
            onPress={() => setShowForm(!showForm)}
            style={styles.addBtn}
          >
            <Ionicons
              name={showForm ? 'close' : 'add'}
              size={22}
              color={colors.primary}
            />
          </Pressable>
        </Animated.View>

        {showForm && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.formCard}>
            <Text style={styles.formTitle}>Add Favourite</Text>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g. Home, Work)"
              placeholderTextColor={colors.textMuted}
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Address (optional)"
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="Suburb"
              placeholderTextColor={colors.textMuted}
              value={suburb}
              onChangeText={setSuburb}
            />
            <Pressable onPress={handleAdd} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Location</Text>
            </Pressable>
          </Animated.View>
        )}

        <FlatList
          data={favourites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="star-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySubtitle}>
                Save locations to label your trip start and end points
              </Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderCurve: 'continuous',
  },
  formTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    ...typography.body,
    borderCurve: 'continuous',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  saveBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  deleteAction: {
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginLeft: spacing.sm,
    borderCurve: 'continuous',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
