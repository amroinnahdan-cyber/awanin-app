import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Check, ChevronRight, MapPin, Navigation, Search } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { Chip } from '@/components/ui';
import { useLocationDirectory, useSelectedAir } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, readableOn } from '@/lib/aqi';
import { placeImage } from '@/lib/placeImages';
import { HOME_LOCATION, selectLocation, useAppState } from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, shadow, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/**
 * Green cover rectangles, labels and marker positions are taken verbatim from
 * Figma node 2027:8240 ("Peta Jakarta"), expressed as percentages of the
 * 390 x 718 map area so the layout holds on any screen height.
 */
const PARKS = [
  { x: 6.15, y: 3.95, w: 27.77, h: 18.95 },
  { x: 61.79, y: 6.33, w: 27.47, h: 12.67 },
  { x: 30.77, y: 28.75, w: 22.46, h: 14.56 },
  { x: 5.13, y: 59.91, w: 20.64, h: 17.86 },
  { x: 71.54, y: 45.26, w: 25.74, h: 15.59 },
  { x: 53.33, y: 76.4, w: 25.01, h: 12.51 },
];

const DISTRICTS = [
  { name: 'Gambir', x: 34.1, y: 26.32 },
  { name: 'Tanah Abang', x: 6.15, y: 66.57 },
  { name: 'Menteng', x: 61.54, y: 54.6 },
  { name: 'Senen', x: 79.74, y: 39.83 },
  { name: 'Sawah Besar', x: 34.62, y: 15.32 },
];

/** Marker circles: left/top of the 43px dot, as percentages of the map area. */
const MARKERS = [
  { name: 'Monas', x: 25.64, y: 33.15 },
  { name: 'Kota Tua', x: 73.08, y: 22.6 },
  { name: 'GBK', x: 16.5, y: 62.5 },
  { name: 'Bundaran HI', x: 70.51, y: 64.76 },
];

/** Category filter chips, as in the showcase. */
const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'baik', label: 'Baik' },
  { key: 'sedang', label: 'Sedang' },
  { key: 'tidak', label: 'Tidak Sehat' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function matchesFilter(filter: FilterKey, aqi: number | undefined): boolean {
  if (filter === 'semua' || aqi === undefined) return true;
  if (filter === 'baik') return aqi <= 50;
  if (filter === 'sedang') return aqi > 50 && aqi <= 100;
  return aqi > 100;
}

const slugFor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function PetaScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const directory = useLocationDirectory();
  const air = useSelectedAir();
  const { selected } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('semua');

  const aqiBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of directory.data ?? []) map.set(entry.slug, entry.aqi);
    return map;
  }, [directory.data]);

  const aqiFor = (name: string) => aqiBySlug.get(slugFor(name));
  const selectedAqi = aqiBySlug.get(selected.slug) ?? air.data?.aqi;
  const selectedCategory = selectedAqi === undefined ? null : categoryFor(selectedAqi);

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.map}>
        {/*
          Stylised road network, still hand-drawn (Figma keeps the real geometry
          in vector image nodes the API would not serve). Arterials pass the four
          landmarks the markers pin: the Sudirman–Thamrin spine through the two
          western markers, a boulevard bending down to Kota Tua, and the
          Ciliwung-ish river running north–south just west of Menteng.
        */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          viewBox="0 0 390 718"
          preserveAspectRatio="none"
        >
          {/* River — drawn first so roads bridge over it */}
          <Path
            d="M 212 740 C 200 640 238 575 228 500 C 218 425 252 360 244 288 C 236 220 258 140 252 -20"
            stroke={colors.river}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 228 500 C 190 488 160 470 142 442"
            stroke={colors.river}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
          />
          {/* Arterials */}
          <Path
            d="M -20 530 C 40 480 66 436 76 392 C 90 330 96 286 100 238 C 106 176 112 96 120 -20"
            stroke={colors.road}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M -20 300 C 55 292 92 276 128 258 C 198 224 242 318 262 398 C 272 436 280 452 288 468 C 312 522 348 602 410 652"
            stroke={colors.road}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 390 108 C 338 118 302 146 278 182 C 252 220 198 236 148 242"
            stroke={colors.road}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
          {/* Secondary streets */}
          <Path d="M 8 92 C 90 80 170 72 260 78 C 310 82 350 92 386 106" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 4 166 C 70 152 148 142 226 148 C 288 152 340 166 388 184" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M -6 348 C 60 336 132 330 196 342 C 252 352 316 372 392 382" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M -4 438 C 72 424 150 418 214 432 C 268 444 330 468 392 478" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 6 596 C 92 578 176 566 252 574 C 312 580 356 596 388 614" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 30 12 C 52 140 70 286 78 420 C 84 530 84 640 74 716" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 166 8 C 176 120 180 240 172 356 C 166 470 172 602 188 716" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 306 4 C 312 118 306 236 296 344 C 288 452 298 596 322 714" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 358 60 C 350 180 346 320 352 448 C 356 540 368 626 382 700" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 12 668 C 110 646 210 638 300 652" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 226 236 C 258 262 292 278 330 284" stroke={colors.road} strokeWidth={4} fill="none" />
          <Path d="M 96 486 C 132 502 158 526 174 558" stroke={colors.road} strokeWidth={4} fill="none" />
        </Svg>

        {PARKS.map((park, index) => (
          <View
            key={index}
            style={[
              styles.park,
              {
                left: `${park.x}%`,
                top: `${park.y}%`,
                width: `${park.w}%`,
                height: `${park.h}%`,
              },
            ]}
          />
        ))}

        <Text style={styles.city}>Jakarta</Text>
        {DISTRICTS.map((district) => (
          <Text
            key={district.name}
            style={[styles.district, { left: `${district.x}%`, top: `${district.y}%` }]}
          >
            {district.name}
          </Text>
        ))}

        {MARKERS.filter((marker) => matchesFilter(filter, aqiFor(marker.name))).map((marker) => {
          const aqi = aqiFor(marker.name);
          const category = aqi === undefined ? null : categoryFor(aqi);
          const isSelected = selected.slug === slugFor(marker.name);
          return (
            <Pressable
              key={marker.name}
              accessibilityRole="button"
              accessibilityLabel={
                aqi === undefined
                  ? `${marker.name}, memuat`
                  : `${marker.name}, AQI ${aqi}. Pilih lokasi`
              }
              accessibilityState={{ selected: isSelected }}
              onPress={() => selectLocation(slugFor(marker.name))}
              style={({ pressed }) => [
                styles.marker,
                { left: `${marker.x}%`, top: `${marker.y}%` },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.markerDot,
                  { backgroundColor: category?.color ?? colors.track },
                  isSelected && styles.markerDotSelected,
                ]}
              >
                {isSelected ? (
                  <Check size={18} color={readableOn(category?.color ?? colors.track)} strokeWidth={2.6} />
                ) : (
                  <Text
                    style={[
                      styles.markerValue,
                      { color: readableOn(category?.color ?? colors.track) },
                    ]}
                  >
                    {aqi ?? ''}
                  </Text>
                )}
              </View>
              <Text style={[styles.markerLabel, isSelected && styles.markerLabelSelected]}>
                {marker.name}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cari lokasi"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        >
          <Search size={20} color={colors.muted} strokeWidth={1.8} />
          <Text style={styles.searchLabel}>Cari lokasi...</Text>
        </Pressable>

        <View style={styles.filterRow}>
          {FILTERS.map((entry) => (
            <Chip
              key={entry.key}
              label={entry.label}
              active={filter === entry.key}
              onPress={() => setFilter(entry.key)}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pusatkan ke ${HOME_LOCATION.name}`}
          onPress={() => selectLocation(HOME_LOCATION.slug)}
          style={({ pressed }) => [styles.recenter, pressed && styles.pressed]}
        >
          <Navigation size={23} color={colors.accent} strokeWidth={1.8} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Detail ${selected.name}`}
          style={({ pressed }) => [styles.preview, pressed && styles.previewPressed]}
          onPress={() =>
            router.push({ pathname: '/lokasi/[slug]', params: { slug: selected.slug } })
          }
        >
          {placeImage(selected.slug) ? (
            <Image source={placeImage(selected.slug) as number} style={styles.previewPhoto} />
          ) : (
            <LinearGradient colors={[colors.sky, colors.tint]} style={styles.previewPhoto}>
              <MapPin size={20} color={colors.accent} strokeWidth={1.8} />
            </LinearGradient>
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>{selected.name}</Text>
            <Text style={styles.previewSubtitle}>{selected.area}</Text>
            <Text
              style={[
                styles.previewAqi,
                { color: selectedCategory?.color ?? colors.mutedText },
              ]}
            >
              {selectedCategory
                ? `AQI ${selectedAqi} · ${selectedCategory.label}`
                : directory.error
                  ? 'Gagal memuat indeks'
                  : 'Memuat indeks…'}
            </Text>
          </View>
          {directory.error && !directory.data ? (
            <Text
              accessibilityRole="button"
              onPress={() => void directory.reload()}
              style={styles.retry}
            >
              Coba lagi
            </Text>
          ) : (
            <ChevronRight size={21} color={colors.muted} strokeWidth={1.8} />
          )}
        </Pressable>
      </View>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    map: {
      flex: 1,
      backgroundColor: colors.mapBg,
      overflow: 'hidden' as const,
    },
    park: {
      position: 'absolute' as const,
      backgroundColor: colors.park,
      borderRadius: 12,
    },
    city: {
      position: 'absolute' as const,
      left: '39.74%',
      top: '45.26%',
      fontFamily: font.bold,
      fontSize: 20,
      lineHeight: 29,
      color: colors.mapLabel,
    },
    district: {
      position: 'absolute' as const,
      fontFamily: font.regular,
      fontSize: 10,
      lineHeight: 14,
      color: colors.areaLabel,
    },
    marker: {
      position: 'absolute' as const,
      alignItems: 'center' as const,
      gap: 5,
    },
    markerDot: {
      width: 43,
      height: 43,
      borderRadius: radius.pill,
      borderWidth: 3,
      borderColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...shadow,
    },
    pressed: {
      opacity: 0.7,
    },
    markerDotSelected: {
      borderColor: colors.accent,
      borderWidth: 3,
    },
    markerValue: {
      ...typo.bodyStrong,
    },
    markerLabelSelected: {
      color: colors.accent,
    },
    markerLabel: {
      fontFamily: font.bold,
      fontSize: 11,
      lineHeight: 15,
      color: colors.ink,
    },
    search: {
      position: 'absolute' as const,
      left: spacing.gutter,
      top: 13,
      width: 350,
      height: 46,
      borderRadius: radius.control,
      backgroundColor: colors.surface,
      paddingHorizontal: 13,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      ...shadow,
    },
    searchLabel: {
      ...typo.body,
      color: colors.muted,
    },
    filterRow: {
      position: 'absolute' as const,
      left: spacing.gutter,
      top: 67,
      flexDirection: 'row' as const,
      gap: 8,
    },
    recenter: {
      position: 'absolute' as const,
      left: '83.59%',
      top: '75.21%',
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...shadow,
    },
    previewPressed: {
      opacity: 0.85,
    },
    retry: {
      ...typo.caption,
      color: colors.accent,
    },
    preview: {
      position: 'absolute' as const,
      left: spacing.gutter,
      top: '83.57%',
      width: 350,
      height: 88,
      borderRadius: radius.card,
      backgroundColor: colors.surface,
      paddingHorizontal: 15,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      ...shadow,
    },
    previewPhoto: {
      width: 54,
      height: 54,
      borderRadius: radius.control,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    previewInfo: {
      flex: 1,
      gap: 3,
    },
    previewTitle: {
      ...typo.heading,
      color: colors.ink,
    },
    previewSubtitle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    previewAqi: {
      ...typo.bodyStrong,
    },
  };
}
