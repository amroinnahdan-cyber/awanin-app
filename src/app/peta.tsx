import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { fetchIndonesiaAqi, type IndonesiaReading } from '@/api/indonesia';
import { AirMapView, type AirMapPoint } from '@/components/AirMapView';
import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Card, Chip, InlineError, Skeleton } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import {
  AQI_CATEGORIES,
  categoryFor,
  indexUnit,
  ISPU_CATEGORIES,
  PM25_CATEGORIES,
  pm25Category,
  readableOn,
  type AqiCategory,
} from '@/lib/aqi';
import { displayedAqi } from '@/lib/indonesia';
import { useBackOrHome } from '@/lib/navigation';
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { useAppState } from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * Free interactive map: Leaflet over OpenStreetMap tiles — no API key, no
 * subscription. Cities are coloured by their current category on the chosen
 * scale, or in the PM2.5 mode by the WHO concentration bands the pollutant
 * bars use — the number inside each circle is then the raw concentration.
 * Tapping a circle opens the city's existing detail screen, and the category
 * chips double as legend and filter.
 */

/** Circle label unit in the PM2.5 mode; matches the pollutant rows' unit. */
const PM25_UNIT = 'μg/m³';

/** Which value the circles carry: the chosen index, or raw PM2.5. */
type ColorMode = 'indeks' | 'pm25';

export default function PetaScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const goBack = useBackOrHome('/');
  const { selected, settings } = useAppState();
  const scale = settings.indexScale;

  const [mode, setMode] = useState<ColorMode>('indeks');
  // 'semua', or the `short` of a category on the active table.
  const [filter, setFilter] = useState('semua');

  // Same batched call and ten-minute cache as the Indonesia screen, so opening
  // the map costs nothing extra once the ranking is warm — and vice versa.
  const [reading, setReading] = useState<IndonesiaReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async (force = false) => {
    try {
      // State is touched only after the await, so a mount effect here is not
      // the cascading-render case the react-hooks rule targets.
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
    // `load` is async and touches state only after the first await: this is
    // the same mount-fetch pattern the Indonesia screen uses, and the rule
    // cannot see through the call to know no synchronous setState happens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  // The table the chips, filter, and colours all come from: the active scale's
  // categories, or the WHO PM2.5 bands in the pollutant mode.
  const categories = useMemo(
    () =>
      mode === 'pm25' ? PM25_CATEGORIES : scale === 'ispu' ? ISPU_CATEGORIES : AQI_CATEGORIES,
    [mode, scale],
  );

  // A filter picked on another mode or scale may name a category this table
  // does not have ("Sensitif" exists on neither ISPU nor the PM2.5 bands):
  // fall back to Semua rather than silently showing every city.
  const activeFilter = categories.some((category) => category.short === filter)
    ? filter
    : 'semua';

  const points = useMemo<AirMapPoint[]>(() => {
    const cityBySlug = new Map(INDONESIA_CITIES.map((city) => [city.slug, city]));
    const result: AirMapPoint[] = [];
    for (const entry of reading?.readings ?? []) {
      const city = cityBySlug.get(entry.slug);
      if (!city) continue;
      let value: number;
      let category: AqiCategory;
      let unit: string;
      if (mode === 'pm25') {
        // No PM2.5 in the batch → no honest colour either: the city sits this
        // mode out instead of borrowing an index category.
        if (entry.pm25 == null) continue;
        value = Math.round(entry.pm25);
        category = pm25Category(entry.pm25);
        unit = PM25_UNIT;
      } else {
        value = displayedAqi(entry, scale);
        category = categoryFor(value, scale);
        unit = indexUnit(scale);
      }
      if (activeFilter !== 'semua' && category.short !== activeFilter) continue;
      result.push({
        slug: city.slug,
        name: city.name,
        province: city.province,
        latitude: city.latitude,
        longitude: city.longitude,
        value,
        color: category.color,
        labelColor: readableOn(category.color),
        unit,
      });
    }
    return result;
  }, [reading, scale, mode, activeFilter]);

  const pickCity = useCallback(
    (slug: string) => router.push({ pathname: '/lokasi/[slug]', params: { slug } }),
    [],
  );

  const mapReady = reading !== null;

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke layar Indonesia"
            hitSlop={12}
            onPress={goBack}
            style={({ pressed }) => [pressed && styles.headerPressed]}
          >
            <ArrowLeft size={20} color={colors.accent} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.headerTitle}>Peta Udara Indonesia</Text>
          <Text style={styles.headerUnit}>
            {mode === 'pm25' ? PM25_UNIT : indexUnit(scale)}
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {mode === 'pm25'
            ? 'Warna per band PM2.5 menurut panduan WHO, angka dalam μg/m³. Ketuk lingkaran untuk membuka lokasinya.'
            : '100 kota terpantau, warna per kategori. Ketuk lingkaran untuk membuka lokasinya.'}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.modeTrackWrap}>
          <View style={styles.modeTrack}>
            <Chip
              label={indexUnit(scale)}
              active={mode === 'indeks'}
              onPress={() => setMode('indeks')}
              style={styles.modeChip}
            />
            <Chip
              label="PM2.5"
              active={mode === 'pm25'}
              onPress={() => setMode('pm25')}
              style={styles.modeChip}
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            label="Semua"
            active={activeFilter === 'semua'}
            onPress={() => setFilter('semua')}
            style={styles.filterChip}
          />
          {categories.map((category) => (
            <Chip
              key={category.short}
              label={category.short}
              dot={category.color}
              active={activeFilter === category.short}
              onPress={() => setFilter(category.short)}
              style={styles.filterChip}
            />
          ))}
        </ScrollView>
      </View>

      {mapReady ? (
        <View style={styles.mapSlot}>
          <AirMapView points={points} onSelect={pickCity} />
        </View>
      ) : loading ? (
        <View style={[styles.mapSlot, styles.skeletonSlot]}>
          <View style={styles.skeletonPill}>
            <Skeleton width={150} height={10} />
            <View style={styles.skeletonGap} />
            <Skeleton width={110} height={10} />
          </View>
          <Text style={styles.loadingLabel}>Menyiapkan peta 100 kota…</Text>
        </View>
      ) : (
        <View style={styles.mapSlot}>
          <ScrollView
            contentContainerStyle={styles.errorContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load(true);
                }}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
          >
            <Card tone="tint">
              <InlineError message={error ?? 'Koneksi gagal'} onRetry={() => void load(true)} />
            </Card>
            <Text style={styles.errorHint}>
              Tarik ke bawah untuk mencoba lagi, atau buka tab Sekitar untuk daftar kota.
            </Text>
          </ScrollView>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerCount}>
            {points.length} dari {reading?.readings.length ?? 0} kota
          </Text>
          <Text style={styles.footerCurrent} numberOfLines={1}>
            Aktif: {selected.name}
          </Text>
        </View>
        <Text style={styles.attribution}>
          Peta tile gratis © kontributor OpenStreetMap · data udara Open-Meteo
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 6,
      gap: 3,
    },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    headerPressed: {
      opacity: 0.7,
    },
    headerTitle: {
      ...typo.title,
      flex: 1,
      color: colors.ink,
    },
    headerUnit: {
      ...typo.bodyStrong,
      color: colors.accent,
    },
    headerSubtitle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    controls: {
      marginTop: 10,
      gap: 8,
    },
    modeTrackWrap: {
      paddingHorizontal: spacing.gutter,
    },
    modeTrack: {
      flexDirection: 'row' as const,
      alignSelf: 'flex-start' as const,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      padding: 4,
      gap: 4,
    },
    modeChip: {
      flex: 0,
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto' as const,
      paddingHorizontal: 14,
    },
    filterRow: {
      gap: 6,
      // Leading gutter aligns the first chip with the header; the trailing one
      // lets the last chip scroll clear of the screen edge.
      paddingHorizontal: spacing.gutter,
    },
    filterChip: {
      flex: 0,
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto' as const,
      paddingHorizontal: 12,
    },
    mapSlot: {
      flex: 1,
      marginHorizontal: spacing.gutter,
      marginTop: 10,
      borderRadius: radius.card,
      overflow: 'hidden' as const,
      backgroundColor: colors.track,
    },
    skeletonSlot: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 14,
    },
    skeletonPill: {
      alignItems: 'center' as const,
      gap: 8,
    },
    skeletonGap: {
      height: 2,
    },
    loadingLabel: {
      ...typo.caption,
      color: colors.mutedText,
    },
    errorContent: {
      padding: spacing.gutter,
      gap: 10,
    },
    errorHint: {
      ...typo.caption,
      color: colors.mutedText,
      textAlign: 'center' as const,
    },
    footer: {
      paddingHorizontal: spacing.gutter,
      paddingBottom: 10,
      paddingTop: 8,
      gap: 4,
    },
    footerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    footerCount: {
      ...typo.caption,
      color: colors.mutedText,
    },
    footerCurrent: {
      ...typo.caption,
      color: colors.mutedText,
      flex: 1,
      textAlign: 'right' as const,
    },
    attribution: {
      ...typo.caption,
      color: colors.mutedText,
    },
  };
}
