import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { AQI_CATEGORIES, AQI_SCALE_MAX, categoryFor } from '@/lib/aqi';
import { color, font, radius, shadow, spacing, type as typo } from '@/theme/tokens';

/**
 * Loading placeholder: a soft pulsing block. Used instead of dashes so a slow
 * request reads as "on its way" rather than as a broken value.
 */
export function Skeleton({
  width,
  height,
  radius: corner = 8,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: corner, backgroundColor: color.track, opacity: pulse },
        style,
      ]}
    />
  );
}

/**
 * The full 0-500 AQI scale as a strip, with a marker at the current reading.
 * The ring shows where today sits on its own arc; this shows what the rest of
 * the scale looks like, which is the part a single number hides.
 */
export function AqiLegend({ value, style }: { value?: number; style?: StyleProp<ViewStyle> }) {
  const ratio =
    value === undefined ? null : Math.min(Math.max(value, 0), AQI_SCALE_MAX) / AQI_SCALE_MAX;
  const ticks = [
    { at: 0, label: '0' },
    { at: 50 / AQI_SCALE_MAX, label: '50' },
    { at: 100 / AQI_SCALE_MAX, label: '100' },
    { at: 200 / AQI_SCALE_MAX, label: '200' },
    { at: 1, label: '500' },
  ];

  return (
    <View style={[styles.scale, style]}>
      <View style={styles.scaleHead}>
        <Text style={styles.scaleTitle}>Skala AQI</Text>
        <Text style={styles.scaleValue}>
          {value === undefined ? 'Menunggu data' : `${value} · ${categoryFor(value).short}`}
        </Text>
      </View>

      <View style={styles.scaleBar}>
        {AQI_CATEGORIES.map((category, index) => (
          <View
            key={category.label}
            style={{
              flex: index === AQI_CATEGORIES.length - 1 ? 2 : 1,
              backgroundColor: category.color,
            }}
          />
        ))}
        {ratio === null ? null : (
          <View
            style={[styles.scaleMarker, { left: `${ratio * 100}%` }]}
            pointerEvents="none"
          />
        )}
      </View>

      <View style={styles.scaleTicks}>
        {ticks.map((tick) => (
          <Text
            key={tick.label}
            style={[
              styles.scaleTick,
              { left: `${tick.at * 100}%` },
              tick.at === 1 && styles.scaleTickEnd,
            ]}
          >
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

type CardProps = {
  children: ReactNode;
  tone?: 'surface' | 'tint';
  style?: StyleProp<ViewStyle>;
};

/** radius 18 + shared drop shadow from the file. */
export function Card({ children, tone = 'surface', style }: CardProps) {
  return (
    <View style={[styles.card, tone === 'tint' ? styles.cardTint : styles.cardSurface, style]}>
      {children}
    </View>
  );
}

type SectionTitleProps = {
  title: string;
  action?: string;
  onAction?: () => void;
};

/** "Lokasi Populer" + "Lihat semua" row — 350 wide, space-between. */
export function SectionTitle({ title, action, onAction }: SectionTitleProps) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          onPress={onAction}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Active pill: accent on white text. Inactive: transparent with muted label. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 1px #e5edf8 separator used inside the profile lists. */
export function Divider() {
  return <View style={styles.divider} />;
}

/**
 * The soft off-white glow the hero is built around: in the export it is a flat
 * #fcfcff core (x 130..265 of the 390px card) with a ~20px soft edge, running
 * from just above the ring's centre down past the card's bottom, which is why
 * the gauge reads as a lit dial and the copy below sits on white rather than on
 * sky. Percentage geometry, so it keeps its shape when the hero grows.
 */
export function HeroGlow() {
  // Gradient ids are document-global on web, so keep them unique per instance.
  const id = `hero-glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#fcfcff" stopOpacity="1" />
          <Stop offset="0.7" stopColor="#fcfcff" stopOpacity="1" />
          <Stop offset="0.88" stopColor="#fcfcff" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#fcfcff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={62} rx={25} ry={58} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * AQI category chip that sits under the ring. Always one line: the label width
 * follows the category name instead of being clamped into the ring's inner
 * circle, which is where the old design clipped it against the arc.
 */
export function CategoryPill({
  label,
  tone,
  textTone,
  style,
}: {
  label: string;
  tone: string;
  textTone: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: tone }, style]}>
      <Text style={[styles.pillLabel, { color: textTone }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Honest failure state — shown instead of inventing readings when the
 * Open-Meteo request fails.
 */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>Data belum bisa dimuat: {message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <Text style={styles.errorRetry}>Coba lagi</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = {
  card: {
    borderRadius: radius.card,
    ...shadow,
  },
  cardSurface: {
    backgroundColor: color.surface,
  },
  cardTint: {
    backgroundColor: color.tint,
  },
  sectionTitle: {
    minHeight: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    ...typo.heading,
    color: color.ink,
  },
  sectionAction: {
    ...typo.action,
    color: color.accent,
  },
  chip: {
    flex: 1,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  chipActive: {
    backgroundColor: color.accent,
  },
  chipIdle: {
    backgroundColor: 'transparent',
  },
  chipLabel: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  chipLabelActive: {
    color: color.surface,
    fontFamily: font.bold,
  },
  chipLabelIdle: {
    color: color.mutedText,
    fontFamily: font.regular,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: color.border,
  },
  scale: {
    gap: 7,
  },
  scaleHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  scaleTitle: {
    ...typo.caption,
    color: color.mutedText,
  },
  scaleValue: {
    ...typo.caption,
    fontFamily: font.bold,
    color: color.ink,
  },
  scaleBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: color.track,
  },
  scaleMarker: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 16,
    marginLeft: -1.5,
    borderRadius: 2,
    backgroundColor: color.ink,
  },
  scaleTicks: {
    height: 14,
  },
  scaleTick: {
    position: 'absolute',
    ...typo.micro,
    color: color.mutedText,
    marginLeft: -6,
  },
  scaleTickEnd: {
    marginLeft: -18,
  },
  pill: {
    borderRadius: radius.pill,
    // 10 + bold 12 keeps the widest label ("Tidak Sehat untuk Sensitif", 154px
    // of text) at 174px, i.e. exactly the ring's outer width, so the chip never
    // overhangs the gauge it labels.
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  pillLabel: {
    fontFamily: font.bold,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  error: {
    minHeight: 60,
    borderRadius: radius.card,
    backgroundColor: color.tint,
    borderWidth: 1,
    borderColor: color.border,
    padding: spacing.gutter,
    gap: 6,
  },
  errorText: {
    ...typo.body,
    color: color.ink,
  },
  errorRetry: {
    ...typo.bodyStrong,
    color: color.accent,
  },
} satisfies Record<string, ViewStyle | TextStyle>;