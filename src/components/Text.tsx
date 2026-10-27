import { Text as RNText, type TextProps } from 'react-native';

import { MAX_FONT_SCALE } from '@/theme/tokens';

/**
 * Text with a bounded system font scale.
 *
 * Android and iOS let the user multiply every font size (up to 2× with "Ukuran
 * huruf Besar"). Components here live in boxes with a fixed pixel size — the
 * 174px AQI ring, the forecast cells, the tab bar — so at 1.5–2× the copy
 * overflows its box or clips mid-word. Body copy keeps scaling freely; only the
 * chrome that cannot grow uses this.
 *
 * The default can still be overridden per instance (`maxFontSizeMultiplier={2}`)
 * and `allowFontScaling={false}` remains available for numbers inside SVG-like
 * fixed artwork.
 */
export function Text({
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  ...props
}: TextProps) {
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}
