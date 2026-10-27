import { useMemo } from 'react';
import { View } from 'react-native';
import { Dumbbell } from 'lucide-react-native';

import type { HourlyForecastPoint } from '@/api/openMeteo';
import { Text } from '@/components/Text';
import { Card, SectionTitle, Skeleton } from '@/components/ui';
import { categoryFor, readableOn } from '@/lib/aqi';
import {
  bestExerciseWindow,
  exerciseAdvice,
  isFlatDay,
  remainingHoursToday,
} from '@/lib/bestTime';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, type as typo, type ThemeColors } from '@/theme/tokens';

type BestTimeCardProps = {
  hourly: HourlyForecastPoint[] | undefined;
  observedAt: string | undefined;
  loading: boolean;
};

/**
 * "17.00" — Indonesian clock style, no colon-and-minutes noise. 24 stays 24
 * rather than wrapping to "00.00", which would read as a start time tomorrow.
 */
function clock(hour: number): string {
  return `${String(hour).padStart(2, '0')}.00`;
}

/**
 * "Waktu terbaik olahraga hari ini": the lowest-AQI window left in the day,
 * drawn as the rest of today's hourly series with that window highlighted.
 *
 * Renders nothing when there is no usable hourly series. A stale (cached)
 * reading is filtered out by the caller: recommending "18.00–20.00" from a
 * snapshot taken hours ago would be advice about the past.
 */
export function BestTimeCard({ hourly, observedAt, loading }: BestTimeCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const hours = useMemo(
    () => remainingHoursToday(hourly, observedAt),
    [hourly, observedAt],
  );
  const best = useMemo(() => bestExerciseWindow(hours), [hours]);
  const flat = useMemo(() => isFlatDay(hours), [hours]);

  if (!best) {
    if (!loading) return null;
    return (
      <View style={styles.block}>
        <SectionTitle title="Waktu terbaik olahraga" />
        <Card style={styles.card}>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Dumbbell size={20} color={colors.accent} strokeWidth={1.8} />
            </View>
            <View style={styles.headText}>
              <Skeleton width={96} height={11} />
              <Skeleton width={132} height={20} style={styles.skeletonGap} />
            </View>
          </View>
          <Skeleton width="100%" height={56} radius={8} />
        </Card>
      </View>
    );
  }

  const windowLabel = flat
    ? `${clock(hours[0].hour)} – ${clock(hours[hours.length - 1].hour + 1)}`
    : `${clock(best.startHour)} – ${clock(best.endHour)}`;
  const shownAqi = flat
    ? Math.round(hours.reduce((total, point) => total + point.aqi, 0) / hours.length)
    : best.avgAqi;
  const tone = categoryFor(shownAqi);
  const advice = exerciseAdvice(shownAqi);
  const inWindow = (hour: number) =>
    flat
      ? true
      : hour >= best.startHour && hour < best.endHour;

  return (
    <View style={styles.block}>
      <SectionTitle title="Waktu terbaik olahraga" />
      <View
        accessible
        accessibilityLabel={`Waktu terbaik olahraga ${windowLabel}, AQI ${shownAqi}, ${tone.label}. ${advice}`}
      >
        <Card style={styles.card}>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Dumbbell size={20} color={colors.accent} strokeWidth={1.8} />
            </View>
            <View style={styles.headText}>
              <Text style={styles.eyebrow}>
                {flat ? 'Sisa hari ini cenderung stabil' : 'Jendela terbaik tersisa hari ini'}
              </Text>
              <Text style={styles.range}>{windowLabel}</Text>
              <Text style={styles.detail}>
                AQI {shownAqi} · {tone.label}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: tone.color }]}>
              <Text style={[styles.badgeLabel, { color: readableOn(tone.color) }]}>
                {tone.short}
              </Text>
            </View>
          </View>

          <View style={styles.bars} pointerEvents="none">
            {hours.map((point) => (
              <View key={point.hour} style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: 10 + (Math.min(point.aqi, 200) / 200) * 36,
                      // Only the recommended window carries a category colour;
                      // tinting every hour made the whole strip look highlighted.
                      backgroundColor: inWindow(point.hour)
                        ? categoryFor(point.aqi).color
                        : colors.track,
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.axis}>
            <Text style={styles.axisLabel}>{clock(hours[0].hour)}</Text>
            <Text style={styles.axisLabel}>{clock(hours[hours.length - 1].hour + 1)}</Text>
          </View>

          <Text style={styles.advice}>
            {flat
              ? 'AQI hampir sama sepanjang sisa hari ini — pilih jam yang paling nyaman.'
              : advice}
          </Text>
          <Text style={styles.note}>Prakiraan AQI per jam, model CAMS (Open-Meteo).</Text>
        </Card>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    block: {
      gap: 10,
    },
    card: {
      padding: 16,
      gap: 12,
    },
    head: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headText: {
      flex: 1,
      gap: 1,
    },
    eyebrow: {
      ...typo.micro,
      color: colors.mutedText,
    },
    range: {
      ...typo.title,
      color: colors.ink,
    },
    detail: {
      ...typo.caption,
      color: colors.mutedText,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      maxWidth: 96,
    },
    badgeLabel: {
      ...typo.micro,
      fontFamily: font.bold,
      textAlign: 'center' as const,
    },
    skeletonGap: {
      marginTop: 6,
    },
    bars: {
      height: 48,
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: 3,
    },
    barSlot: {
      flex: 1,
      height: '100%' as const,
      justifyContent: 'flex-end' as const,
    },
    bar: {
      width: '100%' as const,
      borderRadius: 3,
    },
    axis: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: -4,
    },
    axisLabel: {
      ...typo.micro,
      color: colors.mutedText,
    },
    advice: {
      ...typo.body,
      color: colors.ink,
    },
    note: {
      ...typo.micro,
      color: colors.mutedText,
    },
  };
}
