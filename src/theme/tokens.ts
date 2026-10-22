/**
 * Design tokens — transcribed from Figma: Awanin Mobile App / Hi-Fi (node 3:2).
 *
 * Colour values were verified against rendered PNG pixels (bg #f5f9ff, ring #4abc78
 * match byte-for-byte), so these are the file's real values, not estimates.
 *
 * Two deliberate deviations from the file:
 * - `muted` (#8192ab) fails WCAG AA for small text (3.17:1 on white), so
 *   `mutedText` replaces it under 18px and passes AA on both white and bg.
 * - The palette is now a pair: `lightColors` is the file, `darkColors` is the
 *   same hierarchy restated for dark surfaces (no pure black, accent lifted to
 *   #6aa6ff so it still passes AA on #0d1420).
 */
import type { TextStyle, ViewStyle } from 'react-native';

export type ThemeColors = {
  bg: string;
  ink: string;
  muted: string;
  mutedText: string;
  accent: string;
  surface: string;
  tint: string;
  border: string;
  good: string;
  caution: string;
  track: string;
  sky: string;
  heroSky: string;
  /** Bottom stop of the hero gradient */
  heroBottom: string;
  /** Soft off-white core of the hero glow */
  glow: string;
  /** Text/icons drawn on top of `accent` or another saturated fill */
  onAccent: string;
  /** Bottom-sheet backdrop */
  scrim: string;
};

export const lightColors: ThemeColors = {
  bg: '#f5f9ff',
  ink: '#153c70',
  muted: '#8192ab',
  mutedText: '#596b86',
  accent: '#1854c8',
  surface: '#ffffff',
  tint: '#eaf3ff',
  border: '#e5edf8',
  good: '#4abc78',
  caution: '#f5bb42',
  track: '#dfecfd',
  sky: '#d9eeff',
  heroSky: '#c6ecfe',
  heroBottom: '#eef6ff',
  glow: '#fcfcff',
  onAccent: '#ffffff',
  scrim: 'rgba(15, 38, 74, 0.34)',
};

export const darkColors: ThemeColors = {
  bg: '#0d1420',
  ink: '#e8f1ff',
  muted: '#8fa3bf',
  mutedText: '#a9b9cd',
  accent: '#6aa6ff',
  surface: '#151f2e',
  tint: '#1c2a3d',
  border: '#243349',
  good: '#4abc78',
  caution: '#f5bb42',
  track: '#22324a',
  sky: '#16324f',
  heroSky: '#173a5e',
  heroBottom: '#101d2c',
  glow: '#22344a',
  onAccent: '#08182b',
  scrim: 'rgba(0, 0, 0, 0.55)',
};

export const spacing = {
  /** Screen gutter used by every content block (20) */
  gutter: 20,
  /** Status-bar gutter (24) */
  statusGutter: 24,
  /** Vertical gap between content blocks (18) */
  section: 18,
  /** Bottom nav total height (82, incl. 22 home-indicator inset) */
  navHeight: 82,
  navPaddingTop: 12,
  navPaddingBottom: 22,
  navPaddingHorizontal: 18,
} as const;

export const radius = {
  /** Cards & hero */
  card: 18,
  /** Inputs, small buttons */
  control: 10,
  /** Pills / chips / markers */
  pill: 100,
} as const;

export const font = {
  regular: 'Inter_400Regular',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/**
 * Type scale observed in the file: 46 / 19 / 15 / 13 / 12 / 11 / 10.
 * Line height follows Figma's 140% of font size for body text.
 */
export const type = {
  /** AQI number inside the ring — Inter ExtraBold 46 / lh 56 */
  display: { fontFamily: font.extrabold, fontSize: 46, lineHeight: 56 },
  /** Screen titles — Inter Bold 19 / lh 23 */
  title: { fontFamily: font.bold, fontSize: 19, lineHeight: 23 },
  /** Location value, section heading — Inter Bold 15 / lh 21 */
  heading: { fontFamily: font.bold, fontSize: 15, lineHeight: 21 },
  /** Body emphasis — Inter Bold 13 / lh 18 */
  bodyStrong: { fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  /** Body — Inter Regular 13 / lh 18 */
  body: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  /** Inline stats & chips — Inter Regular 12 / lh 17 */
  stat: { fontFamily: font.regular, fontSize: 12, lineHeight: 17 },
  /** Eyebrow / captions — Inter Regular 11 / lh 15 */
  caption: { fontFamily: font.regular, fontSize: 11, lineHeight: 15 },
  /** Updating timestamp — Inter Regular 10 / lh 14 */
  micro: { fontFamily: font.regular, fontSize: 10, lineHeight: 14 },
  /** Section action ("Lihat semua") — Inter Regular 11 / lh 15 */
  action: { fontFamily: font.regular, fontSize: 11, lineHeight: 15 },
} satisfies Record<string, TextStyle>;

/** rgba(40, 91, 160, 0.06) @ 0/4 blur 18 — the file's single shadow. */
export const shadow: ViewStyle = {
  shadowColor: '#285ba0',
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

/** Content column width (390 - 2 * 20) */
export const CONTENT_WIDTH = 350;
