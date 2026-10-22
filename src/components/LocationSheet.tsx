import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Check, Crosshair, Search, Star } from 'lucide-react-native';

import { Sheet, SheetRow } from '@/components/Sheet';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocationDirectory } from '@/hooks/useAirQuality';
import { categoryFor } from '@/lib/aqi';
import {
  ALL_LOCATIONS,
  selectLocation,
  toggleFavorite,
  useAppState,
  type AppLocation,
} from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * The one place a location is chosen: the home header, the history picker and
 * the map's search field all open this sheet, so the choice stays consistent.
 *
 * "Gunakan lokasi saya" reads the device GPS via the shared `useGeolocation`
 * hook and turns the result into a normal location, so every screen keeps
 * working without a parallel code path.
 */
export function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { selected, favorites } = useAppState();
  const directory = useLocationDirectory();
  const [query, setQuery] = useState('');
  const { locating, error: locationError, locate } = useGeolocation();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const aqiBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of directory.data ?? []) map.set(entry.slug, entry.aqi);
    return map;
  }, [directory.data]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ALL_LOCATIONS;
    return ALL_LOCATIONS.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) || entry.area.toLowerCase().includes(needle),
    );
  }, [query]);

  const choose = (entry: AppLocation) => {
    selectLocation(entry.slug);
    onClose();
  };

  const locateMe = async () => {
    if (await locate()) onClose();
  };

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
      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

      <View style={styles.search}>
        <Search size={18} color={colors.mutedText} strokeWidth={1.8} />
        <TextInput
          accessibilityLabel="Cari lokasi"
          value={query}
          onChangeText={setQuery}
          placeholder="Cari lokasi di Jakarta"
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

      {results.map((entry) => {
        const aqi = aqiBySlug.get(entry.slug);
        const category = aqi === undefined ? null : categoryFor(aqi);
        const isSelected = entry.slug === selected.slug;
        const isFavorite = favorites.includes(entry.slug);
        return (
          /*
            The star is a sibling of the row button, not a child: nesting one
            interactive element inside another produced `<button>` inside
            `<button>` on web ("In HTML, button cannot be a descendant of
            button") and an invalid focus order for screen readers.
          */
          <View key={entry.slug} style={[styles.row, isSelected && styles.rowSelected]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={entry.name}
              accessibilityState={{ selected: isSelected }}
              onPress={() => choose(entry)}
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
              ) : (
                <Text style={styles.pending}>memuat…</Text>
              )}

              <View style={styles.checkSlot}>
                {isSelected ? (
                  <Check size={17} color={colors.accent} strokeWidth={2.4} />
                ) : null}
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite
                  ? `Hapus ${entry.name} dari favorit`
                  : `Simpan ${entry.name} ke favorit`
              }
              accessibilityState={{ selected: isFavorite }}
              hitSlop={8}
              onPress={() => toggleFavorite(entry.slug)}
              style={styles.star}
            >
              <Star
                size={18}
                color={isFavorite ? colors.caution : colors.muted}
                fill={isFavorite ? colors.caution : 'transparent'}
                strokeWidth={1.8}
              />
            </Pressable>
          </View>
        );
      })}

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Tidak ada lokasi “{query}”</Text>
          <Text style={styles.emptyBody}>
            Awanin memantau lima titik di Jakarta. Coba Monas, Bundaran HI, GBK, atau Kota Tua —
            atau pakai lokasi GPS-mu.
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    error: {
      ...typo.caption,
      color: '#ef6b56',
      paddingHorizontal: 6,
      paddingBottom: 4,
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
