import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Search, Star } from 'lucide-react-native';

import { Sheet } from '@/components/Sheet';
import { useLocationDirectory } from '@/hooks/useAirQuality';
import { categoryFor } from '@/lib/aqi';
import {
  ALL_LOCATIONS,
  selectLocation,
  toggleFavorite,
  useAppState,
  type AppLocation,
} from '@/state/app';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

/**
 * The one place a location is chosen: the home header, the history picker and
 * the map's search field all open this sheet, so the choice stays consistent.
 */
export function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { selected, favorites } = useAppState();
  const directory = useLocationDirectory();
  const [query, setQuery] = useState('');

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

  return (
    <Sheet
      visible={visible}
      title="Pilih lokasi"
      subtitle="Kualitas udara diperbarui tiap 5 menit dari Open-Meteo"
      onClose={onClose}
    >
      <View style={styles.search}>
        <Search size={18} color={color.mutedText} strokeWidth={1.8} />
        <TextInput
          accessibilityLabel="Cari lokasi"
          value={query}
          onChangeText={setQuery}
          placeholder="Cari lokasi di Jakarta"
          placeholderTextColor={color.muted}
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
          <Pressable
            key={entry.slug}
            accessibilityRole="button"
            accessibilityLabel={entry.name}
            accessibilityState={{ selected: isSelected }}
            onPress={() => choose(entry)}
            style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && styles.rowPressed]}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>{entry.name}</Text>
              <Text style={styles.area}>{entry.area}</Text>
            </View>

            {category ? (
              <View style={[styles.aqiChip, { backgroundColor: `${category.color}1f` }]}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <Text style={[styles.aqiValue, { color: category.color }]}>{aqi}</Text>
                <Text style={[styles.aqiLabel, { color: category.color }]}>{category.short}</Text>
              </View>
            ) : (
              <Text style={styles.pending}>memuat…</Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? `Hapus ${entry.name} dari favorit` : `Simpan ${entry.name} ke favorit`}
              accessibilityState={{ selected: isFavorite }}
              hitSlop={8}
              onPress={() => toggleFavorite(entry.slug)}
              style={styles.star}
            >
              <Star
                size={18}
                color={isFavorite ? color.caution : color.muted}
                fill={isFavorite ? color.caution : 'transparent'}
                strokeWidth={1.8}
              />
            </Pressable>

            <View style={styles.checkSlot}>
              {isSelected ? <Check size={17} color={color.accent} strokeWidth={2.4} /> : null}
            </View>
          </Pressable>
        );
      })}

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Tidak ada lokasi “{query}”</Text>
          <Text style={styles.emptyBody}>
            Awanin baru memantau lima titik di Jakarta. Coba Monas, Sudirman, Menteng, atau Kota Tua.
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: {
    height: 46,
    borderRadius: radius.control,
    backgroundColor: color.tint,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    ...typo.body,
    color: color.ink,
    padding: 0,
  },
  clear: {
    ...typo.caption,
    fontFamily: font.bold,
    color: color.accent,
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    borderRadius: radius.control,
  },
  rowPressed: {
    backgroundColor: color.tint,
  },
  rowSelected: {
    backgroundColor: `${color.accent}0f`,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...typo.body,
    fontFamily: font.bold,
    color: color.ink,
  },
  area: {
    ...typo.caption,
    color: color.mutedText,
  },
  aqiChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: color.mutedText,
  },
  star: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSlot: {
    width: 18,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: spacing.section,
    gap: 4,
  },
  emptyTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  emptyBody: {
    ...typo.caption,
    color: color.mutedText,
  },
});
