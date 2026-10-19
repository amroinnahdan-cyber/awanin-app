import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCountUp } from '@/components/motion';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, type as typo, type ThemeColors } from '@/theme/tokens';

type AqiRingProps = {
  /** Numeric reading, or '—' while loading */
  value: number | string;
  /** 0..1 fill over the AQI scale */
  progress: number;
  categoryColor: string;
  /** Category pill under the number, inside the ring (as in the showcase) */
  badge?: { label: string; tone: string; textTone: string };
  size?: number;
};

const START_ANGLE = -135; // gap sits at the bottom, as in the Figma arc
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [cx + r * Math.sin(radians), cy - r * Math.cos(radians)];
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const largeArc = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to >= from ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

/**
 * Ring: 174px outer diameter, 14px stroke. Centre column reads
 * "AQI" label → big number → category pill, matching the showcase layout.
 */
export function AqiRing({ value, progress, categoryColor, badge, size = 174 }: AqiRingProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const thickness = 14;
  const r = size / 2 - thickness / 2;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const end = START_ANGLE + SWEEP * clamped;

  // A new reading counts up; while loading (non-numeric) the placeholder shows.
  const counted = useCountUp(typeof value === 'number' ? value : 0);
  const shown = typeof value === 'number' ? counted : value;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Indeks kualitas udara ${value}`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path
          d={arcPath(size / 2, size / 2, r, START_ANGLE, START_ANGLE + SWEEP)}
          stroke={colors.track}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
        />
        {clamped > 0 ? (
          <Path
            d={arcPath(size / 2, size / 2, r, START_ANGLE, end)}
            stroke={categoryColor}
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.unit}>AQI</Text>
        <Text style={styles.value}>{shown}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badge.tone }]}>
            <Text style={[styles.badgeLabel, { color: badge.textTone }]} numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    center: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 2,
    },
    unit: {
      ...typo.caption,
      color: colors.mutedText,
    },
    value: {
      ...typo.display,
      color: colors.ink,
    },
    badge: {
      marginTop: 2,
      borderRadius: 100,
      paddingHorizontal: 10,
      paddingVertical: 2,
      maxWidth: 132,
    },
    badgeLabel: {
      ...typo.caption,
      fontFamily: font.bold,
      fontSize: 12,
    },
  };
}
