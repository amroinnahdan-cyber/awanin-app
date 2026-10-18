import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Check, ChevronRight, MapPin, Navigation, Search } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { useLocationDirectory } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor } from '@/lib/aqi';
import { HOME_LOCATION, selectLocation, useAppState } from '@/state/app';
import { color, font, radius, shadow, spacing, type as typo } from '@/theme/tokens';

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
  { name: 'Sudirman', x: 18.85, y: 55.15 },
  { name: 'Menteng', x: 70.51, y: 25.63 },
  { name: 'Kota Tua', x: 73.08, y: 64.76 },
];

const slugFor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function PetaScreen() {
  const topInset = useTopInset();
  const directory = useLocationDirectory();
  const { selected } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);

  const aqiBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of directory.data ?? []) map.set(entry.slug, entry.aqi);
    return map;
  }, [directory.data]);

  const aqiFor = (name: string) => aqiBySlug.get(slugFor(name));
  const selectedAqi = aqiBySlug.get(selected.slug);
  const selectedCategory = selectedAqi === undefined ? null : categoryFor(selectedAqi);

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.map}>
        {/* Road network: approximate — see note in the file summary. */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          viewBox="0 0 390 718"
          preserveAspectRatio="none"
        >
          <Path
            d="M 162 -20 C 182 120 118 244 152 360 C 184 470 118 560 140 740"
            stroke={color.river}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M -20 500 C 100 472 162 380 222 260 C 262 180 322 122 410 92"
            stroke="#ffffff"
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M -20 200 C 120 232 244 300 410 296"
            stroke="#ffffff"
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          <Path d="M 10 148 C 120 132 240 122 380 118" stroke="#ffffff" strokeWidth={4} fill="none" />
          <Path d="M 20 618 C 140 600 260 578 372 558" stroke="#ffffff" strokeWidth={4} fill="none" />
          <Path d="M 62 18 C 88 200 108 420 124 700" stroke="#ffffff" strokeWidth={4} fill="none" />
          <Path d="M 250 12 C 272 200 288 430 302 700" stroke="#ffffff" strokeWidth={4} fill="none" />
          <Path d="M 30 340 C 150 322 260 336 386 356" stroke="#ffffff" strokeWidth={4} fill="none" />
          <Path d="M 320 40 C 336 180 344 320 336 470" stroke="#ffffff" strokeWidth={4} fill="none" />
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

        {MARKERS.map((marker) => {
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
                  { backgroundColor: category?.color ?? color.track },
                  isSelected && styles.markerDotSelected,
                ]}
              >
                {isSelected ? (
                  <Check size={18} color={color.surface} strokeWidth={2.6} />
                ) : (
                  <Text style={styles.markerValue}>{aqi ?? ''}</Text>
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
          accessibilityLabel="Cari lokasi di Jakarta"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        >
          <Search size={20} color={color.muted} strokeWidth={1.8} />
          <Text style={styles.searchLabel}>Cari lokasi di Jakarta</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pusatkan ke ${HOME_LOCATION.name}`}
          onPress={() => selectLocation(HOME_LOCATION.slug)}
          style={({ pressed }) => [styles.recenter, pressed && styles.pressed]}
        >
          <Navigation size={23} color={color.accent} strokeWidth={1.8} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Detail ${selected.name}`}
          style={({ pressed }) => [styles.preview, pressed && styles.previewPressed]}
          onPress={() =>
            router.push({ pathname: '/lokasi/[slug]', params: { slug: selected.slug } })
          }
        >
          <LinearGradient colors={[color.sky, color.tint]} style={styles.previewPhoto}>
            <MapPin size={20} color={color.accent} strokeWidth={1.8} />
          </LinearGradient>
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>{selected.name}</Text>
            <Text style={styles.previewSubtitle}>{selected.area}</Text>
            <Text style={[styles.previewAqi, { color: selectedCategory?.color ?? color.mutedText }]}>
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
            <ChevronRight size={21} color={color.muted} strokeWidth={1.8} />
          )}
        </Pressable>
      </View>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = {
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  map: {
    flex: 1,
    backgroundColor: color.mapBg,
    overflow: 'hidden',
  },
  park: {
    position: 'absolute',
    backgroundColor: color.park,
    borderRadius: 12,
  },
  city: {
    position: 'absolute',
    left: '39.74%',
    top: '45.26%',
    fontFamily: font.bold,
    fontSize: 20,
    lineHeight: 29,
    color: color.mapLabel,
  },
  district: {
    position: 'absolute',
    fontFamily: font.regular,
    fontSize: 10,
    lineHeight: 14,
    color: color.areaLabel,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    gap: 5,
  },
  markerDot: {
    width: 43,
    height: 43,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  pressed: {
    opacity: 0.7,
  },
  markerDotSelected: {
    borderColor: color.accent,
    borderWidth: 3,
  },
  markerValue: {
    ...typo.bodyStrong,
    color: color.surface,
  },
  markerLabelSelected: {
    color: color.accent,
  },
  markerLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 15,
    color: color.ink,
  },
  search: {
    position: 'absolute',
    left: spacing.gutter,
    top: 13,
    width: 350,
    height: 46,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow,
  },
  searchLabel: {
    ...typo.body,
    color: color.muted,
  },
  recenter: {
    position: 'absolute',
    left: '83.59%',
    top: '75.21%',
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  previewPressed: {
    opacity: 0.85,
  },
  retry: {
    ...typo.caption,
    color: color.accent,
  },
  preview: {
    position: 'absolute',
    left: spacing.gutter,
    top: '83.57%',
    width: 350,
    height: 88,
    borderRadius: radius.card,
    backgroundColor: color.surface,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow,
  },
  previewPhoto: {
    width: 54,
    height: 54,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    gap: 3,
  },
  previewTitle: {
    ...typo.heading,
    color: color.ink,
  },
  previewSubtitle: {
    ...typo.caption,
    color: color.mutedText,
  },
  previewAqi: {
    ...typo.bodyStrong,
  },
} satisfies Record<string, ViewStyle | TextStyle>;