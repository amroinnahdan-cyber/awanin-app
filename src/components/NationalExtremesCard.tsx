import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { TrendDelta } from '@/components/TrendDelta';
import { Card, InlineError, SectionTitle, Skeleton } from '@/components/ui';
import { useCityTrends } from '@/hooks/useAirQuality';
import { categoryFor, readableOn } from '@/lib/aqi';
import { relativeTime } from '@/lib/format';
import { describeTrend, pickExtremes, type IndonesiaRow } from '@/lib/indonesia';
import { selectLocation } from '@/state/app';
import { font, radius, type as typo, type ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/ThemeProvider';

type Props = {
  /** Every city with a current reading, sorted cleanest first */
  rows: IndonesiaRow[];
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  selectedSlug: string;
  onRetry: () => void;
};

/**
 * "Udara terbaik & terburuk" — replaces the old Lokasi Populer strip.
 *
 * The four old cards (Monas, Bundaran HI, GBK, Kota Tua) sit within five
 * kilometres of each other and are read from the same model grid cell, so they
 * mostly repeated one number. The national extremes say something the hero ring
 * cannot: where today's air is clean and where it is dangerous.
 *
 * Each row also carries its 24-hour change (see `parseHourlyTrend`): the
 * extremes alone cannot say whether a dirty city is getting better and a clean
 * one worse. The deltas come from a second, deliberately tiny request for these
 * six cities rather than the hourly series of all hundred.
 *
 * Honesty notes kept in the UI: the caption names the source as a CAMS model
 * rather than measuring stations, and the list shows three cities per side
 * because the cleanest city and the runner-up are often one AQI point apart.
 */
export function NationalExtremesCard({
  rows,
  fetchedAt,
  loading,
  error,
  selectedSlug,
  onRetry,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const { best, worst } = useMemo(() => pickExtremes(rows, 3), [rows]);
  const featured = useMemo(() => [...best, ...worst], [best, worst]);
  const rankBySlug = useMemo(
    () => new Map(rows.map((row, index) => [row.city.slug, index + 1] as const)),
    [rows],
  );
  const featuredCities = useMemo(() => featured.map((row) => row.city), [featured]);
  // One extra Open-Meteo call for these six cities only, so each row can say
  // which way its air moved overnight.
  const { data: trends } = useCityTrends(featuredCities);

  const pending = loading && rows.length === 0;

  if (!pending && rows.length === 0) {
    if (!error) return null;
    return (
      <View style={styles.block}>
        <SectionTitle title="Udara terbaik & terburuk" />
        <InlineError message={error} onRetry={onRetry} />
      </View>
    );
  }

  const group = (label: string, entries: IndonesiaRow[]) => (
    <View>
      <View style={styles.groupHead}>
        <Text style={styles.groupLabel}>{label}</Text>
      </View>
      {entries.map(({ city, aqi }) => {
        const tone = categoryFor(aqi);
        const isSelected = selectedSlug === city.slug;
        const rank = rankBySlug.get(city.slug);
        const trend = trends?.[city.slug];
        const trendLabel = trend ? `, ${describeTrend(trend)}` : '';
        return (
          <Pressable
            key={city.slug}
            accessibilityRole="button"
            accessibilityLabel={`${city.name}, ${city.province}, AQI ${aqi}${trendLabel}. Buka detail`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              selectLocation(city.slug);
              router.push({ pathname: '/lokasi/[slug]', params: { slug: city.slug } });
            }}
            style={({ pressed }) => [
              styles.row,
              isSelected && styles.rowSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.rank}>{rank ? String(rank).padStart(2, '0') : '–'}</Text>
            <View style={styles.rowText}>
              <Text
                numberOfLines={1}
                style={[styles.name, isSelected && styles.nameSelected]}
              >
                {city.name}
              </Text>
              <Text numberOfLines={1} style={styles.province}>
                {city.province}
                {isSelected ? ' · dipakai' : ''}
              </Text>
            </View>
            <View style={styles.right}>
              <View style={[styles.pill, { backgroundColor: tone.color }]}>
                <Text style={[styles.pillLabel, { color: readableOn(tone.color) }]}>
                  {aqi}
                </Text>
              </View>
              <TrendDelta trend={trend} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.block}>
      <SectionTitle
        title="Udara terbaik & terburuk"
        action="Lihat semua"
        onAction={() => router.push('/indonesia')}
      />

      <Card style={styles.card}>
        {pending ? (
          <View style={styles.skeletons}>
            {[0, 1, 2].map((index) => (
              <View key={`best-${index}`} style={styles.skeletonRow}>
                <Skeleton width={18} height={10} />
                <Skeleton width={index === 0 ? 128 : 104} height={13} />
                <View style={styles.skeletonSpacer} />
                <Skeleton width={40} height={24} radius={12} />
              </View>
            ))}
            <View style={styles.divider} />
            {[0, 1, 2].map((index) => (
              <View key={`worst-${index}`} style={styles.skeletonRow}>
                <Skeleton width={18} height={10} />
                <Skeleton width={index === 0 ? 118 : 96} height={13} />
                <View style={styles.skeletonSpacer} />
                <Skeleton width={40} height={24} radius={12} />
              </View>
            ))}
          </View>
        ) : (
          <>
            {group('Terbersih hari ini', best)}
            <View style={styles.divider} />
            {group('Paling berpolusi', worst)}
          </>
        )}
      </Card>

      <View style={styles.notes}>
        <Text style={styles.note}>
          {rows.length > 0 ? `Dari ${rows.length} kota` : 'Peringkat nasional'}
          {fetchedAt ? ` · diperbarui ${relativeTime(new Date(fetchedAt).toISOString())}` : ''}
        </Text>
        <Text style={styles.note}>
          ▲▼ = perubahan 24 jam · prakiraan model CAMS, bukan stasiun pengukuran.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    block: {
      gap: 10,
    },
    card: {
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    groupHead: {
      paddingHorizontal: 8,
      paddingTop: 2,
      paddingBottom: 4,
    },
    groupLabel: {
      ...typo.micro,
      color: colors.mutedText,
    },
    row: {
      minHeight: 46,
      paddingHorizontal: 8,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      borderRadius: radius.control,
    },
    rowSelected: {
      backgroundColor: colors.tint,
    },
    pressed: {
      opacity: 0.65,
    },
    rank: {
      ...typo.micro,
      width: 18,
      color: colors.mutedText,
    },
    rowText: {
      flex: 1,
      gap: 1,
    },
    name: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    nameSelected: {
      color: colors.accent,
    },
    province: {
      ...typo.micro,
      color: colors.mutedText,
    },
    right: {
      alignItems: 'flex-end' as const,
      gap: 2,
    },
    pill: {
      minWidth: 42,
      height: 26,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pillLabel: {
      ...typo.caption,
      fontFamily: font.bold,
    },
    divider: {
      height: 1,
      marginHorizontal: 8,
      marginVertical: 6,
      backgroundColor: colors.border,
    },
    notes: {
      gap: 2,
    },
    note: {
      ...typo.micro,
      color: colors.mutedText,
    },
    skeletons: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 12,
    },
    skeletonRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      minHeight: 22,
    },
    skeletonSpacer: {
      flex: 1,
    },
  };
}
