import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react-native';

import { fetchIndonesiaAqi, type IndonesiaReading } from '@/api/indonesia';
import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { TrendDelta } from '@/components/TrendDelta';
import { Card, Chip, InlineError, SectionTitle, Skeleton } from '@/components/ui';
import { useCityTrends } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, readableOn } from '@/lib/aqi';
import {
  buildRows,
  describeTrend,
  filterRows,
  summarize,
  type CityFilter,
} from '@/lib/indonesia';
import { useBackOrHome } from '@/lib/navigation';
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { selectLocation, useAppState } from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * Nationwide screen: one batched Open-Meteo call covers every city in the
 * bundle, so "seluruh Indonesia" here means all 38 provinces and their largest
 * cities ranked by current AQI — not a map of monitoring stations.
 */

const FILTERS: { key: CityFilter; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'baik', label: 'Baik' },
  { key: 'sedang', label: 'Sedang' },
  { key: 'tidak', label: 'Tidak Sehat' },
];

const pad = (value: number) => String(value).padStart(2, '0');

function clock(epochMs: number): string {
  const date = new Date(epochMs);
  return `${pad(date.getHours())}.${pad(date.getMinutes())}`;
}

export default function IndonesiaScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const goBack = useBackOrHome('/');
  const { selected } = useAppState();
  // A second request for the 24-hour trend of every city in the ranking. It is
  // cached per city for 30 minutes and shared with the Beranda card.
  const { data: trends } = useCityTrends(INDONESIA_CITIES);

  const [reading, setReading] = useState<IndonesiaReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CityFilter>('semua');
  const alive = useRef(true);

  const load = useCallback(async (force = false) => {
    try {
      // Everything that touches state happens after the await: setting state
      // synchronously inside the mount effect would cascade renders (and trips
      // react-hooks/set-state-in-effect).
      const next = await fetchIndonesiaAqi({ force });
      if (!alive.current) return;
      setReading(next);
      setError(null);
    } catch (caught) {
      if (!alive.current) return;
      setError(caught instanceof Error ? caught.message : 'Koneksi gagal');
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    // `load` is async and touches state only after the first await, so this is
    // not the cascading-render case the rule targets; the linter cannot see
    // through the call. Mirrors the fetch-on-mount effect in `useAirQuality`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const rows = useMemo(() => buildRows(reading?.readings ?? [], INDONESIA_CITIES), [reading]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const visible = useMemo(
    () => filterRows(rows, { query, filter }),
    [rows, query, filter],
  );
  const rankBySlug = useMemo(
    () => new Map(rows.map((row, index) => [row.city.slug, index + 1] as const)),
    [rows],
  );

  const averageCategory = categoryFor(summary.average);
  const provinceCount = useMemo(
    () => new Set(INDONESIA_CITIES.map((city) => city.province)).size,
    [],
  );

  const refresh = () => {
    setRefreshing(true);
    void load(true);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={12}
          onPress={goBack}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Kualitas Udara Indonesia</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            refreshing ? 'Memuat ulang data nasional' : 'Muat ulang data nasional'
          }
          accessibilityState={{ busy: refreshing }}
          hitSlop={12}
          onPress={refresh}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <RefreshCw size={18} color={colors.accent} strokeWidth={1.9} />
          )}
        </Pressable>
      </View>

      <View style={styles.sections}>
        <Card tone="tint" style={styles.summary}>
          {loading && !reading ? (
            <>
              <Skeleton width={150} height={11} />
              <Skeleton width={120} height={42} style={styles.skeletonGap} />
              <Skeleton width={220} height={12} />
            </>
          ) : error && !reading ? (
            <InlineError message={error} onRetry={() => void load(true)} />
          ) : (
            <>
              <Text style={styles.eyebrow}>
                Rata-rata nasional · {summary.monitored} kota
              </Text>
              <View style={styles.averageRow}>
                <Text style={[styles.average, { color: averageCategory.color }]}>
                  {summary.average}
                </Text>
                <View style={styles.averageSide}>
                  <Text style={styles.averageUnit}>AQI</Text>
                  <View style={[styles.badge, { backgroundColor: averageCategory.color }]}>
                    <Text
                      style={[
                        styles.badgeLabel,
                        { color: readableOn(averageCategory.color) },
                      ]}
                    >
                      {averageCategory.short}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.extremes}>
                {summary.cleanest ? (
                  <View style={styles.extreme}>
                    <Text style={styles.extremeLabel}>Terbersih</Text>
                    <Text style={styles.extremeName} numberOfLines={1}>
                      {summary.cleanest.city.name}
                    </Text>
                    <View style={styles.extremeAqiRow}>
                      <Text style={styles.extremeAqi}>AQI {summary.cleanest.aqi}</Text>
                      <TrendDelta trend={trends?.[summary.cleanest.city.slug]} />
                    </View>
                  </View>
                ) : null}
                {summary.worst ? (
                  <>
                    <View style={styles.extremeDivider} />
                    <View style={styles.extreme}>
                      <Text style={styles.extremeLabel}>Terburuk</Text>
                      <Text style={styles.extremeName} numberOfLines={1}>
                        {summary.worst.city.name}
                      </Text>
                      <View style={styles.extremeAqiRow}>
                        <Text style={styles.extremeAqi}>AQI {summary.worst.aqi}</Text>
                        <TrendDelta trend={trends?.[summary.worst.city.slug]} />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>

              <Text style={styles.summaryNote}>
                {summary.clean} kota berudara baik · {summary.unhealthy} kota di atas AQI 100
              </Text>
            </>
          )}
        </Card>

        <View style={styles.search}>
          <Search size={18} color={colors.muted} strokeWidth={1.8} />
          <TextInput
            accessibilityLabel="Cari kota atau provinsi"
            placeholder="Cari kota atau provinsi"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
              hitSlop={10}
              onPress={() => setQuery('')}
            >
              <X size={16} color={colors.muted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          {FILTERS.map((entry) => (
            <Chip
              key={entry.key}
              label={entry.label}
              active={filter === entry.key}
              onPress={() => setFilter(entry.key)}
              style={styles.filterChip}
            />
          ))}
        </View>

        <View>
          <SectionTitle
            title={query || filter !== 'semua' ? `${visible.length} kota` : 'Peringkat kota'}
          />
          <Text style={styles.hint}>
            Diurutkan dari udara paling bersih · ▲▼ perubahan 24 jam. Ketuk kota untuk
            memakainya di semua layar.
          </Text>
        </View>

        {error && reading ? (
          <InlineError message={error} onRetry={() => void load(true)} />
        ) : null}

        <Card style={styles.list}>
          {loading && !reading ? (
            <View style={styles.skeletons}>
              {[0, 1, 2, 3, 4].map((index) => (
                <View key={index} style={styles.skeletonRow}>
                  <Skeleton width={36} height={36} radius={18} />
                  <View style={styles.skeletonText}>
                    <Skeleton width={132} height={13} />
                    <Skeleton width={88} height={11} style={styles.skeletonGapSmall} />
                  </View>
                </View>
              ))}
            </View>
          ) : visible.length === 0 ? (
            <Text style={styles.empty}>
              {rows.length === 0
                ? 'Belum ada kota yang bisa ditampilkan.'
                : 'Tidak ada kota yang cocok dengan pencarian ini.'}
            </Text>
          ) : (
            visible.map(({ city, aqi }, index) => {
              const category = categoryFor(aqi);
              const isSelected = selected.slug === city.slug;
              const rank = rankBySlug.get(city.slug);
              const trend = trends?.[city.slug];

              return (
                <View key={city.slug}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${city.name}, ${city.province}, AQI ${aqi}${
                      trend ? `, ${describeTrend(trend)}` : ''
                    }. Buka detail`}
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
                    <Text style={styles.rank}>{rank ? pad(rank) : '–'}</Text>
                    <View
                      style={[styles.rowBadge, { backgroundColor: category.color }]}
                    >
                      <Text style={[styles.rowBadgeLabel, { color: readableOn(category.color) }]}>
                        {aqi}
                      </Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>
                        {city.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {city.province}
                        {isSelected ? ' · dipakai' : ''}
                      </Text>
                    </View>
                    <TrendDelta trend={trend} />
                    <ChevronRight size={19} color={colors.muted} strokeWidth={1.8} />
                  </Pressable>
                </View>
              );
            })
          )}
        </Card>

        <View style={styles.footer}>
          <Text style={styles.credit}>
            {reading
              ? `Diperbarui ${clock(reading.fetchedAt)} · ${provinceCount} provinsi`
              : `${provinceCount} provinsi terpantau`}
          </Text>
          <Text style={styles.credit}>
            Prakiraan AQI model CAMS (Open-Meteo), bukan stasiun pengukuran. Data kota:
            GeoNames (CC BY 4.0).
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingBottom: 40,
    },
    header: {
      height: 56,
      paddingHorizontal: spacing.gutter,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    headerTitle: {
      ...typo.title,
      flex: 1,
      color: colors.ink,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      gap: spacing.section,
    },
    summary: {
      padding: 16,
      gap: 10,
    },
    eyebrow: {
      ...typo.micro,
      color: colors.mutedText,
    },
    averageRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: 10,
    },
    average: {
      ...typo.display,
      lineHeight: 56,
    },
    averageSide: {
      paddingBottom: 6,
      gap: 4,
    },
    averageUnit: {
      ...typo.caption,
      color: colors.mutedText,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
      alignSelf: 'flex-start' as const,
    },
    badgeLabel: {
      ...typo.micro,
      fontFamily: font.bold,
    },
    extremes: {
      flexDirection: 'row' as const,
      alignItems: 'stretch' as const,
      borderRadius: radius.control,
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 12,
    },
    extreme: {
      flex: 1,
      gap: 1,
    },
    extremeDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    extremeLabel: {
      ...typo.micro,
      color: colors.mutedText,
    },
    extremeName: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    extremeAqiRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    extremeAqi: {
      ...typo.caption,
      color: colors.mutedText,
    },
    summaryNote: {
      ...typo.caption,
      color: colors.mutedText,
    },
    skeletonGap: {
      marginTop: 8,
    },
    skeletonGapSmall: {
      marginTop: 5,
    },
    search: {
      height: 46,
      borderRadius: radius.control,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    searchInput: {
      ...typo.body,
      flex: 1,
      color: colors.ink,
      paddingVertical: 0,
    },
    filters: {
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      padding: 4,
      flexDirection: 'row' as const,
      gap: 4,
    },
    filterChip: {
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto' as const,
      paddingHorizontal: 12,
    },
    hint: {
      ...typo.caption,
      color: colors.mutedText,
      marginTop: 3,
    },
    list: {
      paddingVertical: 4,
    },
    row: {
      minHeight: 58,
      paddingHorizontal: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      borderRadius: radius.control,
    },
    rowSelected: {
      backgroundColor: colors.tint,
    },
    rank: {
      ...typo.micro,
      width: 18,
      color: colors.mutedText,
    },
    rowBadge: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    rowBadgeLabel: {
      ...typo.bodyStrong,
    },
    rowText: {
      flex: 1,
      gap: 1,
    },
    rowName: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    rowNameSelected: {
      color: colors.accent,
    },
    rowMeta: {
      ...typo.caption,
      color: colors.mutedText,
    },
    divider: {
      height: 1,
      marginHorizontal: 12,
      backgroundColor: colors.border,
    },
    empty: {
      ...typo.body,
      color: colors.mutedText,
      paddingHorizontal: 14,
      paddingVertical: 16,
    },
    skeletons: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 16,
    },
    skeletonRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    skeletonText: {
      gap: 2,
    },
    footer: {
      gap: 4,
    },
    credit: {
      ...typo.micro,
      color: colors.mutedText,
      textAlign: 'center' as const,
    },
    pressed: {
      opacity: 0.65,
    },
  };
}
