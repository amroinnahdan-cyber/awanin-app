import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, MapPin, RefreshCw } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  useIndonesiaRanking,
  useLocationAir,
  useLocationDirectory,
  useSelectedAir,
} from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, readableOn } from '@/lib/aqi';
import { relativeTime } from '@/lib/format';
import { distanceKm, formatCoordinates, formatDistance } from '@/lib/geo';
import { placeImage } from '@/lib/placeImages';
import {
  ALL_LOCATIONS,
  DEVICE_LOCATION_SLUG,
  selectDeviceLocation,
  selectLocation,
  useAppState,
} from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, shadow, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * "Sekitar" replaces the old hand-drawn map: there is no map artwork and no
 * projection any more. The screen answers the same question — what is the air
 * like where I am? — with the device fix plus the monitored points sorted by
 * their real distance from it.
 */

/** Category filter chips, as in the showcase. */
const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'baik', label: 'Baik' },
  { key: 'sedang', label: 'Sedang' },
  { key: 'tidak', label: 'Tidak Sehat' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

/** One line in the nearby list: a monitored point or a nationwide city. */
type NearbyRow = {
  slug: string;
  name: string;
  area: string;
  /** Kilometres from the device fix; null when there is no fix to measure from. */
  km: number | null;
  aqi: number | undefined;
};

/**
 * How many cities "Terdekat dari kamu" lists. Eight fills the card without
 * becoming a second national ranking; the rest are one tap away on the Indonesia
 * screen.
 */
const NEARBY_CITY_COUNT = 8;

/**
 * A city this close to one of the five monitored points only repeats it: next to
 * Monas the list would otherwise show "Monas 0,2 km" and "Jakarta 5 km" as two
 * separate places. The landmark wins because its coordinates are the precise
 * ones the app has always used.
 */
const DUPLICATE_POINT_KM = 15;

function matchesFilter(filter: FilterKey, aqi: number | undefined): boolean {
  if (filter === 'semua' || aqi === undefined) return true;
  if (filter === 'baik') return aqi <= 50;
  if (filter === 'sedang') return aqi > 50 && aqi <= 100;
  return aqi > 100;
}

/** Only worth mentioning when the user is actually standing near a landmark. */
const NEARBY_HINT_KM = 3;

export default function SekitarScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const directory = useLocationDirectory();
  const selectedAir = useSelectedAir();
  const { selected, deviceLocation } = useAppState();
  const { locating, error: locateError, needsSettings, openSettings, locate } = useGeolocation();
  const [filter, setFilter] = useState<FilterKey>('semua');

  const deviceCoords = deviceLocation?.location ?? null;

  // Reading for the GPS fix itself: kept separate from `selected` so the card
  // stays correct after the user picks a landmark from the list below.
  const deviceAir = useLocationAir(deviceCoords, DEVICE_LOCATION_SLUG);

  const aqiBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of directory.data ?? []) map.set(entry.slug, entry.aqi);
    return map;
  }, [directory.data]);

  const deviceAqi = deviceCoords ? (deviceAir.data?.aqi ?? aqiBySlug.get(DEVICE_LOCATION_SLUG)) : undefined;

  // A hundred cities cost one weighted request, so it is only worth paying for
  // once a fix exists — without one the list stays on the five monitored points.
  const ranking = useIndonesiaRanking({ enabled: deviceCoords !== null });

  const cityAqi = useMemo(() => {
    const map = new Map<string, number>();
    for (const reading of ranking.data?.readings ?? []) map.set(reading.slug, reading.aqi);
    return map;
  }, [ranking.data]);

  const rows = useMemo<NearbyRow[]>(() => {
    if (!deviceCoords) {
      // Without a fix there is nothing honest to sort by, so the list keeps the
      // app's own order (`HOME_LOCATION` first, then the four landmarks).
      return ALL_LOCATIONS.map((entry) => ({
        slug: entry.slug,
        name: entry.name,
        area: entry.area,
        km: null,
        aqi: aqiBySlug.get(entry.slug),
      }));
    }
    const from = { latitude: deviceCoords.latitude, longitude: deviceCoords.longitude };
    const kmTo = (latitude: number, longitude: number) =>
      distanceKm(from.latitude, from.longitude, latitude, longitude);

    // The monitored landmarks stay in the list with a fix — standing at Monas
    // and being shown "Jakarta, 5 km" instead would be worse than useless.
    const points: NearbyRow[] = ALL_LOCATIONS.map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      area: entry.area,
      km: kmTo(entry.location.latitude, entry.location.longitude),
      aqi: aqiBySlug.get(entry.slug),
    }));

    // Cities that would only repeat a landmark are dropped, then the rest are
    // measured and merged. The list stays whole and is cut only after filtering:
    // slicing first meant a "Baik" filter showed nothing while clean cities
    // simply sat further down the list.
    const cities: NearbyRow[] = INDONESIA_CITIES.filter(
      (city) =>
        !ALL_LOCATIONS.some(
          (entry) =>
            distanceKm(
              entry.location.latitude,
              entry.location.longitude,
              city.latitude,
              city.longitude,
            ) <= DUPLICATE_POINT_KM,
        ),
    ).map((city) => ({
      slug: city.slug,
      name: city.name,
      area: city.province,
      km: kmTo(city.latitude, city.longitude),
      aqi: cityAqi.get(city.slug),
    }));

    return [...points, ...cities].sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }, [deviceCoords, aqiBySlug, cityAqi]);

  const visibleRows = rows
    .filter((row) => matchesFilter(filter, row.aqi))
    .slice(0, deviceCoords ? NEARBY_CITY_COUNT : rows.length);
  const nearest = deviceCoords ? rows[0] : null;
  const usesDeviceLocation = selected.slug === DEVICE_LOCATION_SLUG;
  const selectedAqi =
    (usesDeviceLocation ? deviceAqi : undefined) ??
    aqiBySlug.get(selected.slug) ??
    cityAqi.get(selected.slug) ??
    selectedAir.data?.aqi;
  const selectedCategory = selectedAqi === undefined ? null : categoryFor(selectedAqi);

  const deviceCategory = deviceAqi === undefined ? null : categoryFor(deviceAqi);

  /** Numbers missing, list still usable: the two requests that feed the badges. */
  const aqiIncomplete =
    (directory.error !== null && directory.data === null) ||
    (deviceCoords !== null && ranking.error !== null && ranking.data === null);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          // `force` skips the 5-minute cache, so a pull really re-reads.
          refreshing={directory.refreshing || deviceAir.refreshing}
          onRefresh={() => {
            void directory.reload({ force: true });
            void selectedAir.reload({ force: true });
            if (deviceCoords) {
              void deviceAir.reload({ force: true });
              void ranking.reload({ force: true });
            }
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Di Sekitar Saya</Text>
        <Text style={styles.headerSubtitle}>Kualitas udara pada posisi perangkat</Text>
      </View>

      <View style={styles.sections}>
        <Card tone="tint" style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Crosshair size={21} color={colors.accent} strokeWidth={1.9} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroEyebrow}>
                {deviceCoords ? 'Posisi perangkat' : 'Posisi perangkat belum aktif'}
              </Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {deviceLocation ? deviceLocation.name : 'Lokasi belum terdeteksi'}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={2}>
                {deviceCoords
                  ? formatCoordinates(deviceCoords.latitude, deviceCoords.longitude)
                  : 'Izinkan akses lokasi agar Awanin membaca udara di tempatmu.'}
              </Text>
            </View>
            {deviceCoords ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  locating ? 'Memperbarui lokasi perangkat' : 'Perbarui lokasi perangkat'
                }
                accessibilityState={{ busy: locating }}
                hitSlop={10}
                onPress={() => {
                  if (!locating) void locate();
                }}
                style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <RefreshCw size={17} color={colors.accent} strokeWidth={1.9} />
                )}
              </Pressable>
            ) : null}
          </View>

          {deviceCoords ? (
            <View style={styles.reading}>
              <Text style={[styles.readingValue, { color: deviceCategory?.color ?? colors.muted }]}>
                {deviceAqi ?? '—'}
              </Text>
              <View style={styles.readingText}>
                <Text style={styles.readingCategory}>
                  {deviceCategory ? `AQI · ${deviceCategory.label}` : 'Memuat indeks…'}
                </Text>
                <Text style={styles.readingMeta}>
                  {deviceAir.data
                    ? `Diperbarui ${relativeTime(deviceAir.data.observedAt)}`
                    : deviceAir.error
                      ? 'Indeks belum bisa dimuat'
                      : 'Membaca kualitas udara…'}
                </Text>
              </View>
              {usesDeviceLocation ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeLabel}>Dipakai</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {nearest && nearest.km !== null && nearest.km <= NEARBY_HINT_KM ? (
            <Text style={styles.heroHint}>
              {nearest.km === 0
                ? `Kamu berada di ${nearest.name}.`
                : `Sekitar ${formatDistance(nearest.km)} dari ${nearest.name}.`}
            </Text>
          ) : null}

          {deviceCoords ? (
            usesDeviceLocation ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pakai lokasi perangkat sebagai lokasi aktif"
                onPress={selectDeviceLocation}
                style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
              >
                <MapPin size={16} color={colors.onAccent} strokeWidth={2} />
                <Text style={styles.heroActionLabel}>Gunakan lokasi ini</Text>
              </Pressable>
            )
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Deteksi lokasi perangkat saya"
              accessibilityState={{ busy: locating }}
              onPress={() => {
                if (!locating) void locate();
              }}
              style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Crosshair size={16} color={colors.onAccent} strokeWidth={2} />
              )}
              <Text style={styles.heroActionLabel}>
                {locating ? 'Mendeteksi lokasi…' : 'Deteksi lokasi saya'}
              </Text>
            </Pressable>
          )}

          {locateError ? (
            <View style={styles.locationError}>
              <Text style={styles.error}>{locateError}</Text>
              {/* Denied permanently: the OS will not prompt again, so offer the
                  only route that can still fix it. */}
              {needsSettings ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Buka pengaturan izin lokasi"
                  hitSlop={8}
                  onPress={openSettings}
                >
                  <Text style={styles.retry}>Buka pengaturan</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {/*
            `useLocationAir` keeps the previous error while a new request is in
            flight, so gate on the request actually having finished — otherwise
            the hook's "no coordinates yet" error flashes right after the fix.
          */}
          {deviceCoords && deviceAir.error && !deviceAir.data && !deviceAir.refreshing ? (
            <View style={styles.errorRow}>
              <Text style={styles.error}>Indeks belum bisa dimuat: {deviceAir.error}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Coba muat ulang indeks lokasi perangkat"
                hitSlop={8}
                onPress={() => void deviceAir.reload()}
              >
                <Text style={styles.retry}>Coba lagi</Text>
              </Pressable>
            </View>
          ) : null}
        </Card>

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
          {/* The eight shown are the nearest, not everywhere the app knows:
              the nationwide screen is one tap away for the rest. */}
          <SectionTitle
            title={deviceCoords ? 'Terdekat dari kamu' : 'Lima lokasi terpantau'}
            action={deviceCoords ? 'Lihat semua' : undefined}
            onAction={() => router.push('/indonesia')}
          />
          <Text style={styles.sectionHint}>
            {deviceCoords
              ? 'Titik terpantau dan kota di seluruh Indonesia, diurutkan dari jarak sebenarnya.'
              : 'Aktifkan lokasi untuk melihat titik dan kota terdekat beserta jaraknya.'}
          </Text>
        </View>

        {/*
          A failed AQI request must not hide the list. Names and distances are
          still valid, and picking a row is the whole point of the screen, so the
          badges degrade to "·" with one retry line instead of an error card
          replacing everything.
        */}
        {aqiIncomplete ? (
          <View style={styles.errorRow}>
            <Text style={styles.error}>Angka AQI belum termuat.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Coba muat ulang angka AQI"
              hitSlop={8}
              onPress={() => {
                void directory.reload();
                if (deviceCoords) void ranking.reload();
              }}
            >
              <Text style={styles.retry}>Coba lagi</Text>
            </Pressable>
          </View>
        ) : null}

        <Card style={styles.list}>
          {visibleRows.length === 0 ? (
            <Text style={styles.empty}>Belum ada lokasi pada kategori ini.</Text>
          ) : (
            visibleRows.map((row, index) => {
                const { slug, name, area, km, aqi } = row;
                const category = aqi === undefined ? null : categoryFor(aqi);
                const isSelected = selected.slug === slug;
                const meta = km === null ? area : `${area} · ${formatDistance(km)}`;

                return (
                  <View key={slug}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    {/*
                      Two sibling buttons, not one nested in the other: a
                      Pressable inside a Pressable renders a <button> inside a
                      <button> on web, which React warns about and which swallows
                      the inner tap on native.
                    */}
                    <View style={[styles.row, isSelected && styles.rowSelected]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${name}, ${
                          aqi === undefined ? 'memuat indeks' : `AQI ${aqi}`
                        }, ${meta}. Pilih lokasi`}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => selectLocation(slug)}
                        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
                      >
                        <View
                          style={[
                            styles.rowBadge,
                            { backgroundColor: category?.color ?? colors.track },
                            isSelected && styles.rowBadgeSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rowBadgeLabel,
                              { color: readableOn(category?.color ?? colors.track) },
                            ]}
                          >
                            {aqi ?? '·'}
                          </Text>
                        </View>

                        <View style={styles.rowText}>
                          <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>
                            {name}
                          </Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {meta}
                          </Text>
                        </View>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Buka detail ${name}`}
                        hitSlop={12}
                        onPress={() =>
                          router.push({
                            pathname: '/lokasi/[slug]',
                            params: { slug },
                          })
                        }
                        style={({ pressed }) => [styles.rowDetail, pressed && styles.pressed]}
                      >
                        <ChevronRight size={19} color={colors.muted} strokeWidth={1.8} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
          )}
        </Card>

        <SectionTitle title="Lokasi yang dipakai" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buka detail ${selected.name}`}
          onPress={() =>
            router.push({ pathname: '/lokasi/[slug]', params: { slug: selected.slug } })
          }
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card style={styles.selected}>
            {placeImage(selected.slug) ? (
              <Image source={placeImage(selected.slug) as number} style={styles.selectedPhoto} />
            ) : (
              <LinearGradient colors={[colors.sky, colors.tint]} style={styles.selectedPhoto}>
                <Crosshair size={20} color={colors.accent} strokeWidth={1.8} />
              </LinearGradient>
            )}
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={styles.selectedMeta} numberOfLines={2}>
                {selected.area}
                {usesDeviceLocation && deviceCoords
                  ? ` · ${formatCoordinates(deviceCoords.latitude, deviceCoords.longitude)}`
                  : ''}
              </Text>
              <Text
                style={[styles.selectedAqi, { color: selectedCategory?.color ?? colors.mutedText }]}
              >
                {selectedCategory
                  ? `AQI ${selectedAqi} · ${selectedCategory.label}`
                  : selectedAir.error
                    ? 'Gagal memuat indeks'
                    : 'Memuat indeks…'}
              </Text>
            </View>
            <ChevronRight size={21} color={colors.muted} strokeWidth={1.8} />
          </Card>
        </Pressable>
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
      // minHeight, not height: the title + subtitle stack measured 62px at the
      // default font scale and overflowed once the OS font grew (46 + 36 at 2×).
      minHeight: 62,
      paddingHorizontal: spacing.gutter,
      justifyContent: 'center' as const,
      paddingVertical: 6,
    },
    headerTitle: {
      ...typo.title,
      color: colors.ink,
    },
    headerSubtitle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      gap: spacing.section,
    },
    hero: {
      padding: 16,
      gap: 14,
    },
    heroTop: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 12,
    },
    heroIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    heroText: {
      flex: 1,
      gap: 2,
    },
    heroEyebrow: {
      ...typo.micro,
      color: colors.mutedText,
    },
    heroName: {
      ...typo.heading,
      color: colors.ink,
    },
    heroMeta: {
      ...typo.caption,
      color: colors.mutedText,
    },
    refresh: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    reading: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    readingValue: {
      ...typo.display,
      lineHeight: 52,
    },
    readingText: {
      flex: 1,
      gap: 2,
    },
    readingCategory: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    readingMeta: {
      ...typo.micro,
      color: colors.mutedText,
    },
    activeBadge: {
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    activeBadgeLabel: {
      ...typo.micro,
      fontFamily: font.bold,
      color: colors.onAccent,
    },
    heroHint: {
      ...typo.caption,
      color: colors.mutedText,
    },
    heroAction: {
      height: 44,
      borderRadius: radius.control,
      backgroundColor: colors.accent,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      ...shadow,
    },
    heroActionLabel: {
      ...typo.bodyStrong,
      color: colors.onAccent,
    },
    error: {
      ...typo.caption,
      flex: 1,
      color: colors.mutedText,
    },
    errorRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    locationError: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    retry: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.accent,
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
      // Chips size to their label: with `flex: 1` from the shared Chip, "Tidak
      // Sehat" ran out of room and wrapped onto a second line.
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto' as const,
      paddingHorizontal: 12,
    },
    sectionHint: {
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
      gap: 8,
      borderRadius: radius.control,
    },
    rowSelected: {
      backgroundColor: colors.tint,
    },
    rowMain: {
      flex: 1,
      minHeight: 58,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    rowDetail: {
      width: 28,
      minHeight: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    rowBadgeSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
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
    selected: {
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    selectedPhoto: {
      width: 54,
      height: 54,
      borderRadius: radius.control,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    selectedInfo: {
      flex: 1,
      gap: 2,
    },
    selectedName: {
      ...typo.heading,
      color: colors.ink,
    },
    selectedMeta: {
      ...typo.caption,
      color: colors.mutedText,
    },
    selectedAqi: {
      ...typo.bodyStrong,
    },
    pressed: {
      opacity: 0.7,
    },
  };
}
