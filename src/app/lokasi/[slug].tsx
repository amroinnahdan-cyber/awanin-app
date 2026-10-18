import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CloudSun, HeartPulse, MapPin, Navigation, Star } from 'lucide-react-native';

import { weatherLabel } from '@/api/openMeteo';
import { AqiRing } from '@/components/AqiRing';
import { Card, InlineError } from '@/components/ui';
import { useLocationAir } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { formatTemperature } from '@/lib/format';
import { useBackOrHome } from '@/lib/navigation';
import { categoryFor, gaugeProgress, readableOn } from '@/lib/aqi';
import { placeImage } from '@/lib/placeImages';
import {
  findLocation,
  selectLocation,
  toggleFavorite,
  useAppState,
} from '@/state/app';
import { color, radius, spacing, type as typo } from '@/theme/tokens';

export default function DetailLokasiScreen() {
  const topInset = useTopInset();
  const goBack = useBackOrHome('/peta');
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { favorites, settings } = useAppState();
  const entry = findLocation(slug);
  const air = useLocationAir(entry ? entry.location : null);

  const reading = air.data;
  const aqi = reading?.aqi ?? 0;
  const category = categoryFor(aqi);
  const name = entry?.name ?? 'Lokasi';
  const isFavorite = favorites.includes(slug);
  const hero = placeImage(slug);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {hero ? (
          <ImageBackground source={hero} style={styles.hero} resizeMode="cover">
            <View style={[styles.heroOverlay, { paddingTop: topInset }]} />
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={[color.heroSky, '#eef6ff']}
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
            <ArrowLeft size={19} color={color.accent} strokeWidth={2} />
          </Pressable>
          {entry ? (
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
                color={isFavorite ? color.caution : color.accent}
                fill={isFavorite ? color.caution : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sections}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={styles.title}>{name}</Text>
              <View style={styles.areaRow}>
                <MapPin size={13} color={color.mutedText} strokeWidth={2} />
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
              <Card style={styles.stats}>
                <View style={styles.ringWrap}>
                  <AqiRing
                    value={reading ? aqi : '—'}
                    progress={gaugeProgress(aqi)}
                    categoryColor={reading ? category.color : color.track}
                    badge={{
                      label: reading ? category.short : 'Memuat',
                      tone: reading ? category.color : color.track,
                      textTone: readableOn(reading ? category.color : color.track),
                    }}
                    size={148}
                  />
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka Tips Kesehatan"
                onPress={() => router.push('/tips')}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Card style={styles.recommend}>
                  <View style={styles.recommendIcon}>
                    <HeartPulse size={19} color={color.accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.recommendText}>
                    <Text style={styles.recommendTitle}>Rekomendasi</Text>
                    <Text style={styles.recommendBody}>
                      {reading
                        ? `${category.message} Kamu bisa beraktivitas ${aqi <= 100 ? 'seperti biasa dengan tetap menjaga kesehatan' : 'di dalam ruangan lebih dulu sampai kondisi membaik'}.`
                        : 'Menghubungkan ke Open-Meteo untuk membaca kondisi terkini.'}
                    </Text>
                  </View>
                </Card>
              </Pressable>

              <Card style={styles.weather}>
                <View style={styles.recommendIcon}>
                  <CloudSun size={19} color={color.accent} strokeWidth={1.8} />
                </View>
                <View style={styles.recommendText}>
                  <Text style={styles.recommendTitle}>Cuaca</Text>
                  <Text style={styles.recommendBody}>
                    {reading
                      ? `${formatTemperature(reading.temperature, settings.temperatureUnit)} · ${weatherLabel(reading.weatherCode)} · kelembapan ${reading.humidity}% · angin ${reading.wind} km/j`
                      : 'Menghubungkan ke Open-Meteo…'}
                  </Text>
                </View>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      {entry ? (
        <View style={[styles.footer, { paddingBottom: 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lihat rute ke ${name} di peta`}
            onPress={() => {
              selectLocation(slug);
              router.push('/peta');
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Navigation size={18} color={color.surface} strokeWidth={2} />
            <Text style={styles.ctaLabel}>Lihat Rute</Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 110,
  },
  hero: {
    width: '100%',
    height: 220,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 60, 112, 0.10)',
  },
  heroActions: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleText: {
    gap: 3,
  },
  title: {
    ...typo.title,
    fontSize: 22,
    lineHeight: 27,
    color: color.ink,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  area: {
    ...typo.caption,
    color: color.mutedText,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  ringWrap: {
    width: 148,
  },
  pollutants: {
    flex: 1,
    gap: 8,
  },
  pollutantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollutantLabel: {
    ...typo.body,
    color: color.mutedText,
  },
  pollutantValue: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  pollutantUnit: {
    ...typo.caption,
    color: color.mutedText,
  },
  recommend: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  weather: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  recommendIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendText: {
    flex: 1,
    gap: 3,
  },
  recommendTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  recommendBody: {
    ...typo.caption,
    color: color.mutedText,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
    backgroundColor: color.bg,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  cta: {
    height: 52,
    borderRadius: radius.card,
    backgroundColor: color.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...typo.bodyStrong,
    fontSize: 15,
    color: color.surface,
  },
});
