import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowUpRight, Check, Droplets, Star, Sun, Wind } from 'lucide-react-native';

import { AqiRing } from '@/components/AqiRing';
import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { AqiLegend, Card, CategoryPill, HeroGlow, InlineError } from '@/components/ui';
import { useLocationAir } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { formatTemperature } from '@/lib/format';
import { useBackOrHome } from '@/lib/navigation';
import { categoryFor, formatWib, gaugeProgress, pollutantBand, readableOn } from '@/lib/aqi';
import {
  ALL_LOCATIONS,
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
  const { selected, favorites, settings } = useAppState();
  const entry = findLocation(slug);
  const air = useLocationAir(entry ? entry.location : null);

  const reading = air.data;
  const aqi = reading?.aqi ?? 0;
  const category = categoryFor(aqi);
  const name = entry?.name ?? 'Lokasi';
  const isHome = selected.slug === slug;
  const isFavorite = favorites.includes(slug);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={12}
          onPress={goBack}
        >
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>{entry?.area ?? 'Jakarta'}</Text>
        </View>
        {entry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? `Hapus ${name} dari favorit` : `Simpan ${name} ke favorit`
            }
            accessibilityState={{ selected: isFavorite }}
            hitSlop={10}
            onPress={() => toggleFavorite(slug)}
            style={({ pressed }) => [styles.star, pressed && styles.pressed]}
          >
            <Star
              size={19}
              color={isFavorite ? color.caution : color.muted}
              fill={isFavorite ? color.caution : 'transparent'}
              strokeWidth={1.8}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sections}>
        {!entry ? (
          <InlineError message={`Lokasi "${slug}" tidak dikenal`} />
        ) : air.error && !reading ? (
          <InlineError message={air.error} onRetry={() => void air.reload()} />
        ) : (
          <>
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
                style={styles.pill}
              />

              <Text style={styles.headline}>
                {reading ? category.message : 'Menghubungkan ke Open-Meteo'}
              </Text>
              <Text style={styles.updated}>
                {reading
                  ? `Diperbarui pukul ${formatWib(reading.observedAt)}`
                  : 'Menunggu pembacaan'}
              </Text>

              <View style={styles.weather}>
                <View style={styles.weatherStat}>
                  <Sun size={17} color={color.accent} strokeWidth={1.8} />
                  <Text style={styles.weatherLabel}>
                    {reading
                      ? formatTemperature(reading.temperature, settings.temperatureUnit)
                      : '—'}
                  </Text>
                </View>
                <View style={styles.weatherStat}>
                  <Droplets size={16} color={color.accent} strokeWidth={1.8} />
                  <Text style={styles.weatherLabel}>
                    {reading ? `${reading.humidity}%` : '—'}
                  </Text>
                </View>
                <View style={styles.weatherStat}>
                  <Wind size={17} color={color.accent} strokeWidth={1.8} />
                  <Text style={styles.weatherLabel}>
                    {reading ? `${reading.wind} km/j` : '—'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <AqiLegend value={reading ? aqi : undefined} />

            <Card style={styles.pollutants}>
              <Text style={styles.cardTitle}>Polutan utama</Text>
              {(reading?.pollutants ?? []).map((pollutant) => {
                const band = pollutantBand(pollutant.key, pollutant.value);
                return (
                  <View key={pollutant.key} style={styles.pollutantRow}>
                    <Text style={styles.pollutantName}>{pollutant.label}</Text>
                    <View style={styles.pollutantTrack}>
                      <View
                        style={[
                          styles.pollutantFill,
                          { width: `${band.progress * 100}%`, backgroundColor: band.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.pollutantValue}>{pollutant.value}</Text>
                  </View>
                );
              })}
              {!reading ? (
                <Text style={styles.caption}>Memuat pembacaan polutan…</Text>
              ) : null}
            </Card>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isHome ? 'Lokasi ini sedang dipakai' : `Pakai ${name} sebagai lokasi utama`}
                accessibilityState={{ selected: isHome, disabled: isHome }}
                disabled={isHome}
                onPress={() => selectLocation(slug)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isHome && styles.primaryButtonDone,
                  pressed && styles.pressed,
                ]}
              >
                {isHome ? (
                  <Check size={17} color={color.ink} strokeWidth={2.4} />
                ) : null}
                <Text style={[styles.primaryLabel, isHome && styles.primaryLabelDone]}>
                  {isHome ? 'Lokasi utama kamu' : 'Jadikan lokasi utama'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
                onPress={() => router.push('/peta')}
              >
                <ArrowUpRight size={18} color={color.accent} strokeWidth={1.8} />
                <Text style={styles.mapButtonLabel}>Lihat di peta</Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.caption}>
          Lokasi lain:{' '}
          {ALL_LOCATIONS.filter((item) => item.slug !== slug)
            .map((item) => item.name)
            .join(', ')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    ...typo.title,
    color: color.ink,
  },
  headerSubtitle: {
    ...typo.caption,
    color: color.mutedText,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.section,
  },
  hero: {
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  pill: {
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
  pollutants: {
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  pollutantRow: {
    height: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollutantName: {
    ...typo.stat,
    width: 60,
    color: color.mutedText,
  },
  pollutantTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.tint,
    overflow: 'hidden',
  },
  pollutantFill: {
    height: 8,
    borderRadius: 4,
  },
  pollutantValue: {
    ...typo.stat,
    minWidth: 48,
    textAlign: 'right',
    color: color.ink,
  },
  mapButton: {
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  mapButtonLabel: {
    ...typo.bodyStrong,
    color: color.accent,
  },
  caption: {
    ...typo.micro,
    color: color.mutedText,
  },
  star: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    height: 44,
    flex: 2,
    borderRadius: radius.control,
    backgroundColor: color.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonDone: {
    backgroundColor: color.tint,
  },
  primaryLabel: {
    ...typo.bodyStrong,
    color: '#ffffff',
  },
  primaryLabelDone: {
    color: color.ink,
  },
});