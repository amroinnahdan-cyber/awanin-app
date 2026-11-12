import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Check, Crosshair, Search, Star } from 'lucide-react-native';

import { Sheet, SheetRow } from '@/components/Sheet';
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocationDirectory } from '@/hooks/useAirQuality';
import { categoryFor, type IndexScale } from '@/lib/aqi';
import {
  ALL_LOCATIONS,
  selectLocation,
  toggleFavorite,
  useAppState,
  type AppLocation,
} from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';
import { Text } from '@/components/Text';

/**
 * The one place a location is chosen: the home header, the history picker and
 * the map's search field all open this sheet, so the choice stays consistent.
 *
 * "Gunakan lokasi saya" reads the device GPS via the shared `useGeolocation`
 * hook and turns the result into a normal location, so every screen keeps
 * working without a parallel code path.
 *
 * `includeCities` adds the nationwide city table (already used by the Indonesia
 * screen) to the list. Notification settings turn it on, because an alert is
 * only useful for the city it is about; the other screens keep the five
 * showcase points so they stay a quick pick.
 */

/** The nationwide cities as ordinary locations, ready for `selectLocation`. */
const CITY_OPTIONS: AppLocation[] = INDONESIA_CITIES.map((city) => ({
  slug: city.slug,
  name: city.name,
  area: city.province,
  location: {
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
  },
}));

/**
 * Cities offered before the user types. Rendering all 100 rows made the sheet a
 * six-screen scroll and delayed the first paint, so the empty query shows a
 * shortlist and the search field is how the rest is reached.
 */
const FEATURED_CITY_SLUGS = [
  'jakarta',
  'surabaya',
  'bandung',
  'medan',
  'semarang',
  'makassar',
  'denpasar',
  'palembang',
];

const FEATURED_CITIES: AppLocation[] = FEATURED_CITY_SLUGS.map((slug) =>
  CITY_OPTIONS.find((entry) => entry.slug === slug),
).filter((entry): entry is AppLocation => Boolean(entry));

/** Showcase points get a live AQI chip; cities have no row in the directory. */
const LANDMARK_SLUGS = new Set(ALL_LOCATIONS.map((entry) => entry.slug));

function matchesNeedle(entry: AppLocation, needle: string): boolean {
  return (
    !needle ||
    entry.name.toLowerCase().includes(needle) ||
    entry.area.toLowerCase().includes(needle)
  );
}

export function LocationSheet({
  visible,
  onClose,
  includeCities = false,
}: {
  visible: boolean;
  onClose: () => void;
  /** Offer the nationwide city table as well as the Jakarta landmarks. */
  includeCities?: boolean;
}) {
  const { selected, favorites, settings } = useAppState();
  const scale = settings.indexScale;
  // Only fetch the five live AQI chips once the sheet is actually open.
  const directory = useLocationDirectory({ enabled: visible });
  const [query, setQuery] = useState('');
  const {
    locating,
    error: locationError,
    needsSettings,
    openSettings,
    locate,
  } = useGeolocation();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const aqiBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of directory.data ?? []) map.set(entry.slug, entry.aqi);
    return map;
  }, [directory.data]);

  const landmarkResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ALL_LOCATIONS.filter((entry) => matchesNeedle(entry, needle));
  }, [query]);
  const cityResults = useMemo(() => {
    if (!includeCities) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return FEATURED_CITIES;
    return CITY_OPTIONS.filter((entry) => matchesNeedle(entry, needle));
  }, [includeCities, query]);

  const choose = (entry: AppLocation) => {
    selectLocation(entry.slug);
    onClose();
  };

  const locateMe = async () => {
    if (await locate()) onClose();
  };

  const renderOption = (entry: AppLocation) => (
    <OptionRow
      key={entry.slug}
      entry={entry}
      aqi={aqiBySlug.get(entry.slug)}
      scale={scale}
      pending={LANDMARK_SLUGS.has(entry.slug)}
      selected={entry.slug === selected.slug}
      favorite={favorites.includes(entry.slug)}
      onChoose={choose}
      onToggleFavorite={toggleFavorite}
    />
  );

  return (
    <Sheet
      visible={visible}
      title="Pilih lokasi"
      subtitle="Kualitas udara diperbarui tiap 5 menit dari Open-Meteo"
      onClose={onClose}
    >
      <SheetRow
        icon={
          <Crosshair size={18} color={colors.accent} strokeWidth={1.8} />
        }
        label={locating ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}
        hint="Membaca GPS perangkat (opsional)"
        value={selected.slug === 'lokasi-saya' ? 'Aktif' : undefined}
        onPress={locating ? undefined : () => void locateMe()}
      />
      {locationError ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{locationError}</Text>
          {/* Once the OS stops asking, a sentence alone is a dead end. */}
          {needsSettings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka pengaturan izin lokasi"
              hitSlop={8}
              onPress={openSettings}
            >
              <Text style={styles.settingsLink}>Buka pengaturan</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.search}>
        <Search size={18} color={colors.mutedText} strokeWidth={1.8} />
        <TextInput
          accessibilityLabel="Cari lokasi"
          value={query}
          onChangeText={setQuery}
          placeholder={includeCities ? 'Cari kota atau lokasi' : 'Cari lokasi di Jakarta'}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hapus pencarian"
            hitSlop={8}
            onPress={() => setQuery('')}
          >
            <Text style={styles.clear}>Hapus</Text>
          </Pressable>
        ) : null}
      </View>

      {landmarkResults.map(renderOption)}

      {includeCities && cityResults.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Kota di Indonesia</Text>
          {query.trim() ? null : (
            <Text style={styles.sectionHint}>
              Ketik nama kota untuk mencari dari {INDONESIA_CITIES.length} kota.
            </Text>
          )}
        </>
      ) : null}
      {cityResults.map(renderOption)}

      {landmarkResults.length === 0 && cityResults.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Tidak ada lokasi “{query}”</Text>
          <Text style={styles.emptyBody}>
            {includeCities
              ? `Awanin memantau lima titik di Jakarta dan ${INDONESIA_CITIES.length} kota Indonesia. Coba nama kota lain, atau pakai lokasi GPS-mu.`
              : 'Daftar ini berisi lima titik di Jakarta: Monas, Bundaran HI, GBK, dan Kota Tua. Untuk kota lain, buka layar Indonesia — atau pakai lokasi GPS-mu.'}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

function OptionRow({
  entry,
  aqi,
  scale,
  pending,
  selected,
  favorite,
  onChoose,
  onToggleFavorite,
}: {
  entry: AppLocation;
  aqi: number | undefined;
  scale: IndexScale;
  /** Show "memuat…" while the live chips load; city rows never get a chip. */
  pending: boolean;
  selected: boolean;
  favorite: boolean;
  onChoose: (entry: AppLocation) => void;
  onToggleFavorite: (slug: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const category = aqi === undefined ? null : categoryFor(aqi, scale);

  /*
    The star is a sibling of the row button, not a child: nesting one
    interactive element inside another produced `<button>` inside
    `<button>` on web ("In HTML, button cannot be a descendant of
    button") and an invalid focus order for screen readers.
  */
  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={entry.name}
        accessibilityState={{ selected }}
        onPress={() => onChoose(entry)}
        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
      >
        <View style={styles.rowText}>
          <Text style={styles.name}>{entry.name}</Text>
          <Text style={styles.area}>{entry.area}</Text>
        </View>

        {category ? (
          <View style={[styles.aqiChip, { backgroundColor: `${category.color}1f` }]}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <Text style={[styles.aqiValue, { color: category.color }]}>{aqi}</Text>
            <Text style={[styles.aqiLabel, { color: category.color }]}>
              {category.short}
            </Text>
          </View>
        ) : pending ? (
          <Text style={styles.pending}>memuat…</Text>
        ) : null}

        <View style={styles.checkSlot}>
          {selected ? <Check size={17} color={colors.accent} strokeWidth={2.4} /> : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          favorite
            ? `Hapus ${entry.name} dari favorit`
            : `Simpan ${entry.name} ke favorit`
        }
        accessibilityState={{ selected: favorite }}
        hitSlop={8}
        onPress={() => onToggleFavorite(entry.slug)}
        style={styles.star}
      >
        <Star
          size={18}
          color={favorite ? colors.caution : colors.muted}
          fill={favorite ? colors.caution : 'transparent'}
          strokeWidth={1.8}
        />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    errorBox: {
      paddingHorizontal: 6,
      paddingBottom: 6,
      gap: 2,
      alignItems: 'flex-start' as const,
    },
    error: {
      ...typo.caption,
      color: '#ef6b56',
    },
    settingsLink: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.accent,
      textDecorationLine: 'underline' as const,
      paddingVertical: 2,
    },
    search: {
      height: 46,
      borderRadius: radius.control,
      backgroundColor: colors.tint,
      paddingHorizontal: 13,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 9,
      marginVertical: 6,
    },
    searchInput: {
      flex: 1,
      ...typo.body,
      color: colors.ink,
      padding: 0,
    },
    clear: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.accent,
    },
    sectionLabel: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.mutedText,
      marginTop: spacing.section,
      marginLeft: 6,
      marginBottom: 2,
    },
    sectionHint: {
      ...typo.micro,
      color: colors.mutedText,
      marginLeft: 6,
      marginBottom: 2,
    },
    row: {
      minHeight: 62,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingRight: 6,
      borderRadius: radius.control,
    },
    rowMain: {
      flex: 1,
      alignSelf: 'stretch' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingLeft: 6,
      borderRadius: radius.control,
    },
    rowPressed: {
      backgroundColor: colors.tint,
    },
    rowSelected: {
      backgroundColor: `${colors.accent}0f`,
    },
    rowText: {
      flex: 1,
      gap: 1,
    },
    name: {
      ...typo.body,
      fontFamily: font.bold,
      color: colors.ink,
    },
    area: {
      ...typo.caption,
      color: colors.mutedText,
    },
    aqiChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    aqiValue: {
      ...typo.stat,
      fontFamily: font.bold,
    },
    aqiLabel: {
      ...typo.caption,
    },
    pending: {
      ...typo.caption,
      color: colors.mutedText,
    },
    star: {
      width: 30,
      height: 30,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkSlot: {
      width: 18,
      alignItems: 'center' as const,
    },
    empty: {
      paddingVertical: spacing.section,
      gap: 4,
    },
    emptyTitle: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    emptyBody: {
      ...typo.caption,
      color: colors.mutedText,
    },
  };
}
