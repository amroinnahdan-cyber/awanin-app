import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';

import { describeTrend, type AqiTrend } from '@/lib/indonesia';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { type as typo, type ThemeColors } from '@/theme/tokens';

type Props = {
  trend: AqiTrend | undefined;
  /** Adds "· 24 jam" after the number, for screens with room to explain it */
  withWindow?: boolean;
  /** 12px text instead of 10px — the detail screen */
  large?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The 24-hour change that sits under an AQI number: ▲ rising AQI (worse air),
 * ▼ falling AQI (better air), a dash for unchanged.
 *
 * Colour is reinforcement only — the arrow shape and the number carry the same
 * meaning, and the accessibility label spells the direction out, because the
 * palette's caution yellow is too low-contrast to be a lone signal on white.
 */
export function TrendDelta({ trend, withWindow = false, large = false, style }: Props) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  if (!trend) return null;

  const Icon = trend.delta > 0 ? ArrowUpRight : trend.delta < 0 ? ArrowDownRight : Minus;
  const color =
    trend.delta > 0 ? colors.caution : trend.delta < 0 ? colors.good : colors.mutedText;

  return (
    <View accessible accessibilityLabel={describeTrend(trend)} style={[styles.row, style]}>
      <Icon size={large ? 13 : 11} color={color} strokeWidth={2.4} />
      <Text style={[styles.value, large && styles.valueLarge]}>{Math.abs(trend.delta)}</Text>
      {withWindow ? (
        <Text style={[styles.window, large && styles.valueLarge]}>· 24 jam</Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 1,
    },
    value: {
      ...typo.micro,
      color: colors.mutedText,
    },
    valueLarge: {
      ...typo.stat,
      color: colors.mutedText,
    },
    window: {
      ...typo.micro,
      color: colors.mutedText,
    },
  };
}
