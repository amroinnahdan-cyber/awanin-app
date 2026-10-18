import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bell,
  ChevronDown,
  Droplets,
  Lightbulb,
  MapPin,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react-native';

import { locationSlug } from '@/api/openMeteo';
import { AqiRing } from '@/components/AqiRing';
import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { FadeIn } from '@/components/motion';
import {
  AqiLegend,
  Card,
  CategoryPill,
  HeroGlow,
  InlineError,
  SectionTitle,
  Skeleton,
} from '@/components/ui';
import { usePopularLocations, useSelectedAir } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, formatWib, gaugeProgress, readableOn } from '@/lib/aqi';
import { formatTemperature } from '@/lib/format';
import { useAppState } from '@/state/app';
import { useNotifications } from '@/state/notifications';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

function WeatherStat({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.weatherStat}>
      {icon}
      <Text style={styles.weatherLabel}>{label}</Text>
    </View>
  );
}

function PopularCard({ name, aqi, loading }: { name: string; aqi: number; loading: boolean }) {
  const category = categoryFor(aqi);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Detail ${name}`}
      style={({ pressed }) => [styles.popular, pressed && styles.popularPressed]}
      onPress={() =>
        router.push({ pathname: '/lokasi/[slug]', params: { slug: locationSlug(name) } })
      }
    >
      <LinearGradient colors={[color.sky, color.tint]} style={styles.popularTile}>
        <MapPin size={20} color={color.accent} strokeWidth={1.8} />
      </LinearGradient>
      <Text style={styles.popularName} numberOfLines={1}>
        {name}
      </Text>
      {loading ? (
        <Skeleton width={34} height={12} />
      ) : (
        <View style={styles.popularAqi}>
          <View style={[styles.dot, { backgroundColor: category.color }]} />
          <Text style={styles.popularValue}>{aqi}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function BerandaScreen() {
  const topInset = useTopInset();
  const air = useSelectedAir();
  const popular = usePopularLocations();
  const { selected, settings } = useAppState();
  const notifications = useNotifications();
  const [pickerOpen, setPickerOpen] = useState(false);
  const unread = notifications.filter((entry) => !entry.read).length;

  const reading = air.data;
  const aqi = reading?.aqi ?? 0;
  const category = categoryFor(aqi);

  const headline = reading
    ? category.message
    : air.loading
      ? 'Memuat data udara…'
      : 'Data udara belum tersedia';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={air.refreshing} onRefresh={() => void air.reload()} />
      }
    >
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ganti lokasi, sekarang ${selected.name}`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        >
          <MapPin size={19} color={color.accent} strokeWidth={1.8} />
          <View style={styles.locationText}>
            <Text style={styles.locationEyebrow}>Lokasi Anda</Text>
            <Text style={styles.locationValue}>{selected.name}</Text>
          </View>
          <ChevronDown size={16} color={color.accent} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
            hitSlop={12}
            onPress={() => router.push('/notifikasi')}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Bell size={22} color={color.accent} strokeWidth={1.8} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>
      </View>

      <LinearGradient colors={[color.heroSky, '#eef6ff']} style={styles.hero}>
        <HeroGlow />

        <AqiRing
          value={reading ? aqi : '—'}
          progress={gaugeProgress(aqi)}
          categoryColor={reading ? category.color : color.track}
        />

        <CategoryPill
          label={reading ? category.label : 'Memuat'}
          tone={reading ? category.color : color.track}
          textTone={readableOn(reading ? category.color : color.track)}
          style={styles.categoryPill}
        />

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.updated}>
          {reading ? `Diperbarui pukul ${formatWib(reading.observedAt)}` : 'Menghubungkan ke Open-Meteo'}
        </Text>

        <View style={styles.weather}>
          {reading ? (
            <>
              <WeatherStat
                icon={<Sun size={17} color={color.accent} strokeWidth={1.8} />}
                label={formatTemperature(reading.temperature, settings.temperatureUnit)}
              />
              <WeatherStat
                icon={<Droplets size={16} color={color.accent} strokeWidth={1.8} />}
                label={`${reading.humidity}%`}
              />
              <WeatherStat
                icon={<Wind size={17} color={color.accent} strokeWidth={1.8} />}
                label={`${reading.wind} km/j`}
              />
            </>
          ) : (
            <>
              <Skeleton width={54} height={13} />
              <Skeleton width={42} height={13} />
              <Skeleton width={68} height={13} />
            </>
          )}
        </View>
      </LinearGradient>

      <View style={styles.sections}>
        {air.error && !reading ? (
          <InlineError message={air.error} onRetry={() => void air.reload()} />
        ) : null}

        <FadeIn delay={60}>
          <AqiLegend value={reading ? aqi : undefined} />
        </FadeIn>

        <FadeIn delay={120}>
          <Card tone="tint" style={styles.tipCard}>
            <View style={styles.tipRow}>
              <Sparkles size={24} color={color.accent} strokeWidth={1.8} />
              <View style={styles.tipText}>
                <Text style={styles.tipTitle}>
                  {!reading
                    ? 'Menunggu pembacaan udara'
                    : aqi <= 100
                      ? 'Aktivitas luar ruang aman hari ini'
                      : 'Batasi aktivitas luar ruang hari ini'}
                </Text>
                <Text style={styles.tipSubtitle}>
                  {reading
                    ? `PM2.5 ${reading.pm25} μg/m³ · ${category.label}`
                    : 'Menghubungkan ke Open-Meteo'}
                </Text>
              </View>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={180} style={styles.popularBlock}>
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

        <FadeIn delay={240}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka Tips Kesehatan"
            onPress={() => router.push('/tips')}
            style={({ pressed }) => [pressed && styles.cardPressed]}
          >
            <Card style={styles.tips}>
              <View style={styles.tipsRow}>
                <Lightbulb size={17} color={color.accent} strokeWidth={1.8} />
                <Text style={styles.tipsText}>
                  Tips singkat: buka jendela saat pagi hari ketika kualitas udara masih terbaik.
                </Text>
              </View>
            </Card>
          </Pressable>
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
  { name: 'Sudirman', aqi: 0 },
  { name: 'Menteng', aqi: 0 },
  { name: 'Kota Tua', aqi: 0 },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 21,
  },
  header: {
    height: 60,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 6,
    borderRadius: radius.control,
    marginLeft: -4,
    paddingLeft: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.caution,
    borderWidth: 1.5,
    borderColor: color.bg,
  },
  locationText: {
    gap: 1,
  },
  locationEyebrow: {
    ...typo.caption,
    color: color.mutedText,
  },
  locationValue: {
    ...typo.heading,
    color: color.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hero: {
    // Full-bleed, as drawn in the file (the export shows the gradient running
    // edge to edge), unlike the inset cards below it.
    width: '100%',
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  categoryPill: {
    marginTop: 10,
  },
  headline: {
    ...typo.bodyStrong,
    color: color.ink,
    textAlign: 'center',
    marginTop: 14,
  },
  updated: {
    ...typo.micro,
    color: color.mutedText,
    textAlign: 'center',
    marginTop: 4,
  },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  weatherStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weatherLabel: {
    ...typo.stat,
    color: color.ink,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
    gap: spacing.section,
  },
  tipCard: {
    padding: 14,
  },
  tipRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  tipSubtitle: {
    ...typo.caption,
    color: color.mutedText,
  },
  popularBlock: {
    gap: spacing.section,
  },
  popularRow: {
    flexDirection: 'row',
    gap: 10,
  },
  popular: {
    width: 80,
    height: 140,
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularPressed: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.75,
  },
  credit: {
    alignItems: 'center',
    paddingTop: 2,
  },
  creditText: {
    ...typo.micro,
    color: color.mutedText,
    textDecorationLine: 'underline',
  },
  popularTile: {
    width: 80,
    height: 80,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularName: {
    ...typo.caption,
    fontFamily: font.bold,
    color: color.ink,
    maxWidth: 80,
    textAlign: 'center',
  },
  popularAqi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  popularValue: {
    ...typo.stat,
    color: color.mutedText,
  },
  tips: {
    padding: 13,
  },
  tipsRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipsText: {
    ...typo.caption,
    flex: 1,
    color: color.mutedText,
  },
});