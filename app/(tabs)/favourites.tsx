import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { FavouriteCard } from '@/components/favourite-card';
import { useTranslation } from '@/i18n/useTranslation';

// Stable identifiers for the three label options — the displayed text is
// translated from these identifiers via i18n.
const LABEL_OPTIONS = ['Home', 'Work', 'Custom'] as const;

export default function FavouritesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const favourites = useAppStore((s) => s.favourites);
  const addFavourite = useAppStore((s) => s.addFavourite);
  const deleteFavourite = useAppStore((s) => s.deleteFavourite);

  const labelText = (opt: string) => {
    if (opt === 'Home') return t('favourites.labelHome');
    if (opt === 'Work') return t('favourites.labelWork');
    return t('favourites.labelCustom');
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSuburb, setNewSuburb] = useState('');

  const resetForm = () => {
    setNewLabel('Home');
    setCustomLabel('');
    setNewAddress('');
    setNewSuburb('');
  };

  const handleAdd = () => {
    const label =
      newLabel === 'Custom'
        ? customLabel.trim() || t('favourites.labelCustom')
        : newLabel === 'Home'
        ? t('favourites.labelHome')
        : t('favourites.labelWork');
    if (!newSuburb.trim()) return;

    addFavourite({
      label,
      address: newAddress.trim(),
      suburb: newSuburb.trim(),
      // Default coords (user would normally get these from geocoding)
      lat: -33.8688 + (Math.random() - 0.5) * 0.1,
      lng: 151.2093 + (Math.random() - 0.5) * 0.1,
    });
    setShowAddModal(false);
    resetForm();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 32,
        }}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 26,
              color: Colors.textPrimary,
            }}
          >
            {t('favourites.title')}
          </Text>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={({ pressed }) => ({
              backgroundColor: Colors.primary,
              width: 38,
              height: 38,
              borderRadius: 12,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </Animated.View>

        {/* Empty state */}
        {favourites.length === 0 && (
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="star-outline" size={30} color={Colors.textSecondary} />
            </View>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 17,
                color: Colors.textPrimary,
              }}
            >
              {t('favourites.emptyTitle')}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: 'center',
                maxWidth: 280,
              }}
            >
              {t('favourites.emptyMessage')}
            </Text>
          </Animated.View>
        )}

        {/* Favourite cards */}
        <View style={{ gap: 10 }}>
          {favourites.map((fav, index) => (
            <FavouriteCard
              key={fav.id}
              favourite={fav}
              index={index}
              onDelete={() => deleteFavourite(fav.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Add favourite modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: Colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderCurve: 'continuous',
            }}
          >
            {/* Handle bar */}
            <View
              style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: Colors.surface,
                }}
              />
            </View>

            <View
              style={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 20 }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.bold,
                    fontSize: 20,
                    color: Colors.textPrimary,
                  }}
                >
                  {t('favourites.addTitle')}
                </Text>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={12}>
                  <Ionicons
                    name="close-circle"
                    size={28}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>

              {/* Label selector */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 14,
                    color: Colors.textPrimary,
                  }}
                >
                  {t('favourites.label')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: Colors.surface,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    padding: 3,
                  }}
                >
                  {LABEL_OPTIONS.map((opt) => {
                    const isSelected = newLabel === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setNewLabel(opt)}
                        style={{
                          flex: 1,
                          paddingVertical: 9,
                          borderRadius: 8,
                          borderCurve: 'continuous',
                          backgroundColor: isSelected
                            ? Colors.primary
                            : 'transparent',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected
                              ? Fonts.semiBold
                              : Fonts.medium,
                            fontSize: 13,
                            color: isSelected ? '#fff' : Colors.textSecondary,
                          }}
                        >
                          {labelText(opt)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {newLabel === 'Custom' && (
                  <TextInput
                    value={customLabel}
                    onChangeText={setCustomLabel}
                    placeholder={t('favourites.customLabelPlaceholder')}
                    placeholderTextColor={Colors.textSecondary}
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: 10,
                      borderCurve: 'continuous',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: Fonts.medium,
                      fontSize: 15,
                      color: Colors.textPrimary,
                    }}
                  />
                )}
              </View>

              {/* Address */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 14,
                    color: Colors.textPrimary,
                  }}
                >
                  {t('favourites.address')}
                </Text>
                <TextInput
                  value={newAddress}
                  onChangeText={setNewAddress}
                  placeholder={t('favourites.addressPlaceholder')}
                  placeholderTextColor={Colors.textSecondary}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    color: Colors.textPrimary,
                  }}
                />
              </View>

              {/* Suburb */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 14,
                    color: Colors.textPrimary,
                  }}
                >
                  {t('favourites.suburb')}
                </Text>
                <TextInput
                  value={newSuburb}
                  onChangeText={setNewSuburb}
                  placeholder={t('favourites.suburbPlaceholder')}
                  placeholderTextColor={Colors.textSecondary}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    color: Colors.textPrimary,
                  }}
                />
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleAdd}
                style={({ pressed }) => ({
                  backgroundColor:
                    newSuburb.trim() ? Colors.primary : Colors.surface,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
                disabled={!newSuburb.trim()}
              >
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 16,
                    color: newSuburb.trim() ? '#fff' : Colors.textSecondary,
                  }}
                >
                  {t('favourites.saveFavourite')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
