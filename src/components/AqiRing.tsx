import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCountUp } from '@/components/motion';
import { color, type as typo } from '@/theme/tokens';

type AqiRingProps = {
  /** Numeric reading, or '—' while loading */
  value: number | string;
  /** 0..1 fill over the 0-500 AQI scale */
  progress: number;
  categoryColor: string;
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
 * Ring: 174px outer diameter, 14px stroke — re-measured against the 1:1 design
 * export (beranda.png), where the arc's outer radius is 86.9px.
 *
 * Only the reading belongs inside the ring. The category label lives below it:
 * at the bottom of the inner circle there is no room for a wide label (the inner
 * width at that height is ~131px, while "Tidak Sehat untuk Sensitif" is ~154px),
 * so a pill placed inside cuts through the arc.
 */
export function AqiRing({ value, progress, categoryColor, size = 174 }: AqiRingProps) {
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
          stroke={color.track}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  unit: {
    ...typo.caption,
    // muted (#8192ab) is only 2.98:1 on the hero gradient; intro text is small.
    color: color.mutedText,
  },
  value: {
    ...typo.display,
    color: color.ink,
  },
});