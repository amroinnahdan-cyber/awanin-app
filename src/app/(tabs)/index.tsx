import { useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, ChevronDown, ChevronRight, MapPin, Share2, Wind } from 'lucide-react-native';

import { locationSlug, type PollutantReading } from '@/api/openMeteo';
import { AqiRing } from '@/components/AqiRing';
import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { ForecastStrip } from '@/components/ForecastStrip';
import { LocationSheet } from '@/components/LocationSheet';
import { FadeIn } from '@/components/motion';
import {
  Card,
  HeroGlow,
  InlineError,
  SectionTitle,
  Skeleton,
  StaleBadge,
} from '@/components/ui';
import { usePopularLocations, useSelectedAir, useSelectedHistory } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, gaugeProgress, readableOn } from '@/lib/aqi';
import { placeImage } from '@/lib/placeImages';
import { useAppState } from '@/state/app';
import { useNotifications } from '@/state/notifications';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

function PollutantValue({ pollutant }: { pollutant: PollutantReading | undefined }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.pmItem}>
      <Text style={styles.pmLabel}>{pollutant?.label ?? '—'}</Text>
      <Text style={styles.pmValue}>
        {pollutant ? `${pollutant.value} ${pollutant.unit}` : '—'}
      </Text>
    </View>
  );
}

function PopularCard({ name, aqi, loading }: { name: string; aqi: number; loading: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const category = categoryFor(aqi);
  const image = placeImage(locationSlug(name));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Detail ${name}, AQI ${aqi}`}
      style={({ pressed }) => [styles.popular, pressed && styles.pressed]}
      onPress={() =>
        router.push({ pathname: '/lokasi/[slug]', params: { slug: locationSlug(name) } })
      }
    >
      {image ? (
        <Image source={image} style={styles.popularPhoto} />
      ) : (
        <LinearGradient colors={[colors.sky, colors.tint]} style={styles.popularPhoto} />
      )}
      <Text style={styles.popularName} numberOfLines={1}>
        {name}
      </Text>
      {loading ? (
        <Skeleton width={44} height={12} />
      ) : (
        <Text style={[styles.popularValue, { color: category.color }]}>{aqi} AQI</Text>
      )}
    </Pressable>
  );
}

export default function BerandaScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const air = useSelectedAir();
  const popular = usePopularLocations();
  const history = useSelectedHistory(2);
  const { selected } = useAppState();
  const notifications = useNotifications();
  const [pickerOpen, setPickerOpen] = useState(false);
  const unread = notifications.filter((entry) => !entry.read).length;

  const reading = air.data;
  const aqi = reading?.aqi ?? 0;
  const category = categoryFor(aqi);
  const flavor = aqi <= 100 ? 'cukup baik' : 'kurang baik';

  const pm25 = reading?.pollutants.find((entry) => entry.key === 'pm2_5');
  const pm10 = reading?.pollutants.find((entry) => entry.key === 'pm10');

  // "lebih baik dibanding kemarin" — honest: needs two daily averages.
  const days = history.data ?? [];
  const comparison =
    days.length >= 2
      ? days[days.length - 1].avg <= days[days.length - 2].avg
        ? 'lebih baik dibanding kemarin.'
        : 'lebih buruk dibanding kemarin.'
      : 'akan tersedia setelah cukup data terkumpul.';

  const shareReading = () => {
    const message = reading
      ? `AQI ${selected.name} sekarang ${aqi} (${category.label}). ${category.message} — dipantau lewat Awanin.`
      : `Awanin — pantau kualitas udara Jakarta setiap saat.`;
    void Share.share({ message });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={air.refreshing}
          onRefresh={() => void air.reload()}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <View style={styles.brand}>
          <Image
            source={require('../../../assets/logo-mark.png')}
            style={styles.brandGlyph}
            resizeMode="contain"
          />
          <Text style={styles.brandWord}>awanin</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bagikan kualitas udara"
            hitSlop={12}
            onPress={shareReading}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Share2 size={20} color={colors.accent} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'
            }
            hitSlop={12}
            onPress={() => router.push('/notifikasi')}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Bell size={22} color={colors.accent} strokeWidth={1.8} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ganti lokasi, sekarang ${selected.name}`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        >
          <MapPin size={15} color={colors.accent} strokeWidth={2} />
          <Text style={styles.locationText}>{selected.name}</Text>
          <ChevronDown size={14} color={colors.accent} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introTitle}>Kualitas udara hari ini</Text>
        <Text style={styles.introBody}>
          Udara di sekitar kamu saat ini {reading ? flavor : 'sedang diperiksa'}. Tetap jaga
          kesehatan ya!
        </Text>
      </View>

      <LinearGradient colors={[colors.heroSky, colors.heroBottom]} style={styles.hero}>
        <HeroGlow />

        <AqiRing
          value={reading ? aqi : '—'}
          progress={gaugeProgress(aqi)}
          categoryColor={reading ? category.color : colors.track}
          badge={{
            label: reading ? category.short : 'Memuat',
            tone: reading ? category.color : colors.track,
            textTone: readableOn(reading ? category.color : colors.track),
          }}
        />

        <View style={styles.pmRow}>
          {reading ? (
            <>
              <PollutantValue pollutant={pm25} />
              <View style={styles.pmDivider} />
              <PollutantValue pollutant={pm10} />
            </>
          ) : (
            <>
              <Skeleton width={86} height={13} />
              <View style={styles.pmDivider} />
              <Skeleton width={86} height={13} />
            </>
          )}
        </View>
      </LinearGradient>

      <View style={styles.sections}>
        {reading?.stale ? (
          <StaleBadge cachedAt={reading.cachedAt} />
        ) : null}

        {air.error && !reading ? (
          <InlineError message={air.error} onRetry={() => void air.reload()} />
        ) : null}

        <FadeIn delay={40}>
          <ForecastStrip days={reading?.forecast} loading={air.loading} />
        </FadeIn>

        <FadeIn delay={90}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka riwayat kualitas udara"
            onPress={() => router.push('/riwayat')}
            style={({ pressed }) => [pressed && styles.cardPressed]}
          >
            <Card style={styles.compare}>
              <View style={styles.compareIcon}>
                <Wind size={20} color={colors.accent} strokeWidth={1.8} />
              </View>
              <View style={styles.compareText}>
                <Text style={styles.compareTitle}>Kualitas udara hari ini</Text>
                <Text style={styles.compareSubtitle}>{comparison}</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedText} strokeWidth={1.8} />
            </Card>
          </Pressable>
        </FadeIn>

        <FadeIn delay={140} style={styles.popularBlock}>
          <SectionTitle
            title="Lokasi Populer"
            action="Lihat semua"
            onAction={() => router.push('/peta')}
          />

          <View style={styles.popularRow}>
            {popular.error && !popular.data ? (
              <InlineError message={popular.error} onRetry={() => void popular.reload()} />
            ) : (
              (popular.data ?? popularFallback).map((entry) => (
                <PopularCard
                  key={entry.name}
                  name={entry.name}
                  aqi={entry.aqi}
                  loading={!popular.data}
                />
              ))
            )}
          </View>
        </FadeIn>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Sumber data: Open-Meteo"
          onPress={() => router.push('/tentang')}
          hitSlop={8}
          style={styles.credit}
        >
          <Text style={styles.creditText}>Data kualitas udara & cuaca oleh Open-Meteo</Text>
        </Pressable>
      </View>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </ScrollView>
  );
}

/** Shown only while the four popular-location reads are in flight. */
const popularFallback = [
  { name: 'Monas', aqi: 0 },
  { name: 'Bundaran HI', aqi: 0 },
  { name: 'GBK', aqi: 0 },
  { name: 'Kota Tua', aqi: 0 },
];

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingBottom: 21,
    },
    header: {
      height: 56,
      paddingHorizontal: spacing.gutter,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    headerActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 16,
    },
    brand: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 7,
    },
    brandGlyph: {
      width: 30,
      height: 30,
    },
    brandWord: {
      fontFamily: font.extrabold,
      fontSize: 21,
      lineHeight: 26,
      color: colors.accent,
      letterSpacing: -0.5,
    },
    pressed: {
      opacity: 0.6,
    },
    bellDot: {
      position: 'absolute' as const,
      top: -1,
      right: -1,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.caution,
      borderWidth: 1.5,
      borderColor: colors.bg,
    },
    locationRow: {
      paddingHorizontal: spacing.gutter,
      marginTop: 2,
      marginBottom: 10,
    },
    location: {
      alignSelf: 'flex-start' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingLeft: 10,
      paddingRight: 8,
      paddingVertical: 6,
    },
    locationText: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    intro: {
      paddingHorizontal: spacing.gutter,
      gap: 4,
      marginBottom: 12,
    },
    introTitle: {
      ...typo.title,
      color: colors.ink,
    },
    introBody: {
      ...typo.body,
      color: colors.mutedText,
      maxWidth: 300,
    },
    hero: {
      marginHorizontal: spacing.gutter,
      borderRadius: radius.card,
      overflow: 'hidden' as const,
      alignItems: 'center' as const,
      paddingTop: 20,
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    pmRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 16,
      marginTop: 14,
    },
    pmItem: {
      alignItems: 'center' as const,
      gap: 1,
    },
    pmLabel: {
      ...typo.caption,
      color: colors.mutedText,
    },
    pmValue: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    pmDivider: {
      width: 1,
      height: 22,
      backgroundColor: colors.border,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 18,
      gap: spacing.section,
    },
    compare: {
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    compareIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    compareText: {
      flex: 1,
      gap: 2,
    },
    compareTitle: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    compareSubtitle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    popularBlock: {
      gap: spacing.section,
    },
    popularRow: {
      flexDirection: 'row' as const,
      gap: 10,
      justifyContent: 'space-between' as const,
    },
    popular: {
      width: 80,
      gap: 5,
      alignItems: 'center' as const,
    },
    popularPhoto: {
      width: 80,
      height: 80,
      borderRadius: radius.control,
    },
    popularName: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.ink,
      maxWidth: 80,
      textAlign: 'center' as const,
    },
    popularValue: {
      ...typo.caption,
      fontFamily: font.bold,
      fontSize: 11,
    },
    cardPressed: {
      opacity: 0.75,
    },
    credit: {
      alignItems: 'center' as const,
      paddingTop: 2,
    },
    creditText: {
      ...typo.micro,
      color: colors.mutedText,
      textDecorationLine: 'underline' as const,
    },
  };
}
