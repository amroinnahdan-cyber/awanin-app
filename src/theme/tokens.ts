/**
 * Design tokens — transcribed from Figma: Awanin Mobile App / Hi-Fi (node 3:2).
 *
 * Colour values were verified against rendered PNG pixels (bg #f5f9ff, ring #4abc78
 * match byte-for-byte), so these are the file's real values, not estimates.
 *
 * One deliberate deviation: `muted` (#8192ab) fails WCAG AA when used for small text
 * (3.17:1 on white, 2.97:1 on bg). `mutedText` replaces it for text under 18px and
 * passes AA on both white (5.4:1) and bg (4.9:1). `muted` stays for icons (3.17:1 >
 * the 3.1 threshold for graphical objects) so visuals remain as designed.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const color = {
  /** Page background */
  bg: '#f5f9ff',
  /** Primary text */
  ink: '#153c70',
  /** Secondary text as drawn in Figma (icons, large text only) */
  muted: '#8192ab',
  /** AA-compliant replacement for small secondary text */
  mutedText: '#596b86',
  /** Accent / active / links */
  accent: '#1854c8',
  /** Card surface */
  surface: '#ffffff',
  /** Tinted card surface */
  tint: '#eaf3ff',
  /** Hairline separators */
  border: '#e5edf8',
  /** AQI: Baik */
  good: '#4abc78',
  /** AQI: Sedang */
  caution: '#f5bb42',
  /** Ring track */
  track: '#dfecfd',
  /** Splash sky */
  sky: '#d9eeff',
  /**
   * Top stop of the hero gradient. Measured as #c6ecfe in the 1:1 export
   * (splash-screen.png is a different, shallower blue — hence a separate token).
   * Using `sky` here washed the hero out and made the ring's track invisible.
   */
  heroSky: '#c6ecfe',
  /** Map canvas */
  mapBg: '#f1f4f4',
  /** Map green cover */
  park: '#e0eee2',
  /** Map river */
  river: '#d7ebf6',
  /** Map city label */
  mapLabel: '#748ca7',
  /** Map district label */
  areaLabel: '#a3adb8',
} as const;

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

/** rgba(40, 91, 160, 0.06) @ 0/4 blur 18 — the file's single shadow */
export const shadow: ViewStyle = {
  shadowColor: '#285ba0',
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

/** Content column width (390 - 2 * 20) */
export const CONTENT_WIDTH = 350;