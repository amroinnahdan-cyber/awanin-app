import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CloudSun,
  ExternalLink,
  HeartPulse,
  Locate,
  MapPin,
  Share2,
  Star,
} from 'lucide-react-native';

import { weatherLabel } from '@/api/openMeteo';
import { AqiRing } from '@/components/AqiRing';
import { ForecastStrip } from '@/components/ForecastStrip';
import { TrendDelta } from '@/components/TrendDelta';
import { Card, InlineError, StaleBadge } from '@/components/ui';
import { useCityTrends, useLocationAir } from '@/hooks/useAirQuality';
import { useShare } from '@/hooks/useShare';
import { useTopInset } from '@/hooks/useTopInset';
import { formatTemperature } from '@/lib/format';
import { openUrl } from '@/lib/share';
import { useBackOrHome } from '@/lib/navigation';
import { categoryFor, gaugeProgress, readableOn } from '@/lib/aqi';
import { placeImage } from '@/lib/placeImages';
import {
  findLocation,
  selectLocation,
  toggleFavorite,
  useAppState,
} from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

export default function DetailLokasiScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const goBack = useBackOrHome('/sekitar');
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { selected, favorites, settings } = useAppState();
  const { state: shareState, share } = useShare();

  const known = findLocation(slug);
  const entry = known ?? (selected.slug === slug ? selected : null);
  const air = useLocationAir(entry ? entry.location : null, slug);
  // 24-hour change for this one point; skipped while the slug is unknown. The
  // array is rebuilt each render, but the hook keys on the slug, so that costs
  // a string join and never a second request.
  const trendPoints = entry
    ? [{ slug, latitude: entry.location.latitude, longitude: entry.location.longitude }]
    : [];
  const { data: trends } = useCityTrends(trendPoints);
  const trend = trends?.[slug];

  const reading = air.data;
  const aqi = reading?.aqi ?? 0;
  const category = categoryFor(aqi);
  const name = entry?.name ?? 'Lokasi';
  const isFavorite = favorites.includes(slug);
  const hero = placeImage(slug);

  const shareReading = () => {
    const message = reading
      ? `${name}: AQI ${aqi} (${category.label}). ${category.message} — dipantau lewat Awanin.`
      : `${name} — pantau kualitas udara lewat Awanin.`;
    void share(message);
  };

  const openExternalMap = () => {
    if (!entry) return;
    const { latitude, longitude } = entry.location;
    void openUrl(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {hero ? (
          <ImageBackground source={hero} style={styles.hero} resizeMode="cover">
            <View style={[styles.heroOverlay, { paddingTop: topInset }]} />
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={[colors.heroSky, colors.heroBottom]}
            style={[styles.hero, { paddingTop: topInset }]}
          />
        )}

        <View style={[styles.heroActions, { top: topInset + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={10}
            onPress={goBack}
            style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
          >
            <ArrowLeft size={19} color={colors.accent} strokeWidth={2} />
          </Pressable>
          <View style={styles.heroActionRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                shareState === 'copied'
                  ? 'Teks sudah tersalin ke clipboard'
                  : shareState === 'failed'
                    ? 'Gagal membagikan'
                    : 'Bagikan kualitas udara lokasi ini'
              }
              hitSlop={10}
              onPress={shareReading}
              style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
            >
              {shareState === 'copied' ? (
                <Check size={18} color={colors.good} strokeWidth={2.2} />
              ) : (
                <Share2 size={18} color={colors.accent} strokeWidth={2} />
              )}
            </Pressable>
            {known ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isFavorite ? `Hapus ${name} dari favorit` : `Simpan ${name} ke favorit`
                }
                accessibilityState={{ selected: isFavorite }}
                hitSlop={10}
                onPress={() => toggleFavorite(slug)}
                style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
              >
                <Star
                  size={19}
                  color={isFavorite ? colors.caution : colors.accent}
                  fill={isFavorite ? colors.caution : 'transparent'}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.sections}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={styles.title}>{name}</Text>
              <View style={styles.areaRow}>
                <MapPin size={13} color={colors.mutedText} strokeWidth={2} />
                <Text style={styles.area}>{entry?.area ?? 'Jakarta'}</Text>
              </View>
            </View>
          </View>

          {!entry ? (
            <InlineError message={`Lokasi "${slug}" tidak dikenal`} />
          ) : air.error && !reading ? (
            <InlineError message={air.error} onRetry={() => void air.reload()} />
          ) : (
            <>
              {reading?.stale ? <StaleBadge cachedAt={reading.cachedAt} /> : null}

              <Card style={styles.stats}>
                <View style={styles.ringWrap}>
                  <AqiRing
                    value={reading ? aqi : '—'}
                    progress={gaugeProgress(aqi)}
                    categoryColor={reading ? category.color : colors.track}
                    badge={{
                      label: reading ? category.short : 'Memuat',
                      tone: reading ? category.color : colors.track,
                      textTone: readableOn(reading ? category.color : colors.track),
                    }}
                    size={148}
                  />
                  <TrendDelta trend={trend} withWindow large style={styles.ringTrend} />
                </View>
                <View style={styles.pollutants}>
                  {(reading?.pollutants ?? PLACEHOLDER_POLLUTANTS).map((pollutant) => (
                    <View key={pollutant.key} style={styles.pollutantRow}>
                      <Text style={styles.pollutantLabel}>{pollutant.label}</Text>
                      <Text style={styles.pollutantValue}>
                        {pollutant.value}{' '}
                        <Text style={styles.pollutantUnit}>{pollutant.unit}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              <ForecastStrip days={reading?.forecast} loading={air.loading} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka Tips Kesehatan"
                onPress={() => router.push('/tips')}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Card style={styles.recommend}>
                  <View style={styles.recommendIcon}>
                    <HeartPulse size={19} color={colors.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.recommendText}>
                    <Text style={styles.recommendTitle}>Rekomendasi</Text>
                    <Text style={styles.recommendBody}>
                      {reading
                        ? `${category.message} Kamu bisa beraktivitas ${
                            aqi <= 100
                              ? 'seperti biasa dengan tetap menjaga kesehatan'
                              : 'di dalam ruangan lebih dulu sampai kondisi membaik'
                          }.`
                        : 'Menghubungkan ke Open-Meteo untuk membaca kondisi terkini.'}
                    </Text>
                  </View>
                </Card>
              </Pressable>

              <Card style={styles.weather}>
                <View style={styles.recommendIcon}>
                  <CloudSun size={19} color={colors.accent} strokeWidth={1.8} />
                </View>
                <View style={styles.recommendText}>
                  <Text style={styles.recommendTitle}>Cuaca</Text>
                  <Text style={styles.recommendBody}>
                    {reading
                      ? `${formatTemperature(reading.temperature, settings.temperatureUnit)} · ${weatherLabel(reading.weatherCode)} · kelembapan ${reading.humidity}% · angin ${reading.wind} km/j`
                      : 'Menghubungkan ke Open-Meteo…'}
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Buka lokasi ini di Google Maps"
                    onPress={openExternalMap}
                    hitSlop={6}
                    style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
                  >
                    <Text style={styles.mapLinkLabel}>Buka di Google Maps</Text>
                    <ExternalLink size={13} color={colors.accent} strokeWidth={1.8} />
                  </Pressable>
                </View>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      {entry ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pakai ${name} dan lihat di layar Sekitar`}
            onPress={() => {
              selectLocation(slug);
              router.push('/sekitar');
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Locate size={18} color={colors.onAccent} strokeWidth={2} />
            <Text style={styles.ctaLabel}>Lihat di Sekitar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const PLACEHOLDER_POLLUTANTS = [
  { key: 'pm2_5', label: 'PM2.5', value: 0, unit: 'μg/m³' },
  { key: 'pm10', label: 'PM10', value: 0, unit: 'μg/m³' },
  { key: 'o3', label: 'O₃', value: 0, unit: 'μg/m³' },
  { key: 'no2', label: 'NO₂', value: 0, unit: 'μg/m³' },
  { key: 'so2', label: 'SO₂', value: 0, unit: 'μg/m³' },
];

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingBottom: 110,
    },
    hero: {
      width: '100%' as const,
      height: 220,
    },
    heroOverlay: {
      flex: 1,
      backgroundColor: 'rgba(21, 60, 112, 0.10)',
    },
    heroActions: {
      position: 'absolute' as const,
      left: spacing.gutter,
      right: spacing.gutter,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    heroActionRight: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    circleButton: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pressed: {
      opacity: 0.7,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      marginTop: -22,
      gap: spacing.section,
    },
    titleRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
    },
    titleText: {
      gap: 3,
    },
    title: {
      ...typo.title,
      fontSize: 22,
      lineHeight: 27,
      color: colors.ink,
    },
    areaRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    area: {
      ...typo.caption,
      color: colors.mutedText,
    },
    stats: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 16,
      gap: 12,
    },
    ringWrap: {
      width: 148,
      alignItems: 'center' as const,
    },
    ringTrend: {
      marginTop: 4,
    },
    pollutants: {
      flex: 1,
      gap: 8,
    },
    pollutantRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    pollutantLabel: {
      ...typo.body,
      color: colors.mutedText,
    },
    pollutantValue: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    pollutantUnit: {
      ...typo.caption,
      color: colors.mutedText,
    },
    recommend: {
      flexDirection: 'row' as const,
      padding: 14,
      gap: 12,
      alignItems: 'flex-start' as const,
    },
    weather: {
      flexDirection: 'row' as const,
      padding: 14,
      gap: 12,
      alignItems: 'flex-start' as const,
    },
    recommendIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    recommendText: {
      flex: 1,
      gap: 3,
    },
    recommendTitle: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    recommendBody: {
      ...typo.caption,
      color: colors.mutedText,
      lineHeight: 16,
    },
    mapLink: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      marginTop: 4,
    },
    mapLinkLabel: {
      ...typo.caption,
      color: colors.accent,
      textDecorationLine: 'underline' as const,
    },
    footer: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.gutter,
      paddingTop: 10,
      paddingBottom: 12,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cta: {
      height: 52,
      borderRadius: radius.card,
      backgroundColor: colors.accent,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    ctaPressed: {
      opacity: 0.85,
    },
    ctaLabel: {
      ...typo.bodyStrong,
      fontSize: 15,
      color: colors.onAccent,
    },
  };
}
