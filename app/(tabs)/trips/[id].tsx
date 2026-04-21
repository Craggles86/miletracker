import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAppStore } from '@/store/useAppStore';
import { RouteMapPreview } from '@/components/route-map-preview';
import { formatDistance, formatDuration, formatTripDateLocale, formatTimeLocale } from '@/utils/helpers';
import { useTranslation } from '@/i18n/useTranslation';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useAppStore((s) => s.trips.find((tr) => tr.id === id));
  const unit = useAppStore((s) => s.settings.distanceUnit);
  const { t, locale } = useTranslation();

  if (!trip) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <Stack.Screen options={{ title: t('trips.detailTitle') }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
        <Text
          style={{
            fontFamily: Fonts.semiBold,
            fontSize: 17,
            color: Colors.textSecondary,
          }}
        >
          {t('trips.notFound')}
        </Text>
      </View>
    );
  }

  const isBusiness = trip.purpose === 'Business';
  const badgeColor = isBusiness ? Colors.businessBadge : Colors.personalBadge;
  const purposeLabel = isBusiness ? t('trips.business') : t('trips.personal');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 20 }}
    >
      <Stack.Screen
        options={{
          title: `${trip.startSuburb} → ${trip.endSuburb}`,
        }}
      />

      {/* Route map preview */}
      <Animated.View entering={FadeIn.duration(500)}>
        <RouteMapPreview
          routePoints={trip.routePoints}
          height={240}
          startSuburb={trip.startSuburb}
          endSuburb={trip.endSuburb}
        />
      </Animated.View>

      {/* Trip summary card */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(400)}
        style={{
          backgroundColor: Colors.card,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 20,
          borderWidth: 1,
          borderColor: Colors.border,
          gap: 16,
        }}
      >
        {/* Header row with badge */}
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
              flex: 1,
            }}
            numberOfLines={1}
          >
            {trip.startSuburb} → {trip.endSuburb}
          </Text>
          <View
            style={{
              backgroundColor: badgeColor,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 8,
              borderCurve: 'continuous',
              marginLeft: 8,
            }}
          >
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 12, color: '#fff' }}>
              {purposeLabel}
            </Text>
          </View>
        </View>

        {/* Detail rows */}
        <View style={{ gap: 14 }}>
          <DetailRow
            icon="calendar-outline"
            label={t('trips.date')}
            value={formatTripDateLocale(trip.startTime, locale)}
          />
          <DetailRow
            icon="time-outline"
            label={t('trips.time')}
            value={`${formatTimeLocale(trip.startTime, locale)} — ${formatTimeLocale(trip.endTime, locale)}`}
          />
          <DetailRow
            icon="navigate-outline"
            label={t('trips.distance')}
            value={formatDistance(trip.distance, unit)}
          />
          <DetailRow
            icon="hourglass-outline"
            label={t('trips.duration')}
            value={formatDuration(trip.duration)}
          />
          <DetailRow
            icon="location-outline"
            label={t('trips.from')}
            value={trip.startSuburb}
          />
          <DetailRow
            icon="flag-outline"
            label={t('trips.to')}
            value={trip.endSuburb}
          />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          borderCurve: 'continuous',
          backgroundColor: `${Colors.primary}12`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 12,
            color: Colors.textSecondary,
          }}
        >
          {label}
        </Text>
        <Text
          selectable
          style={{
            fontFamily: Fonts.medium,
            fontSize: 15,
            color: Colors.textPrimary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
