import { Text, View } from 'react-native';

import { Card, SectionTitle, Skeleton } from '@/components/ui';
import { dayLabel, shortDate } from '@/lib/aqi';
import type { DayAqi } from '@/api/openMeteo';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, type as typo, type ThemeColors } from '@/theme/tokens';

const SCALE_MAX = 200;

/**
 * Seven-day outlook. Bars use the same category colours as the ring, scaled to
 * 200 AQI so an ordinary week still shows visible differences instead of seven
 * identical stubs.
 */
export function ForecastStrip({
  days,
  loading,
  title,
}: {
  days: DayAqi[] | undefined;
  loading: boolean;
  title?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  // Open-Meteo only publishes AQI forecasts for five days, so the heading
  // follows the data instead of promising seven bars and drawing two empty ones.
  const heading = title ?? `Prakiraan ${days && days.length > 0 ? days.length : 7} hari`;

  return (
    <View style={styles.block}>
      <SectionTitle title={heading} />
      <Card style={styles.card}>
        {loading && !days ? (
          <View style={styles.row}>
            {Array.from({ length: 7 }).map((_, index) => (
              <View key={index} style={styles.item}>
                <Skeleton width={14} height={11} />
                <Skeleton width={8} height={44} radius={4} />
                <Skeleton width={22} height={11} />
              </View>
            ))}
          </View>
        ) : !days || days.length === 0 ? (
          <Text style={styles.empty}>Prakiraan belum tersedia untuk lokasi ini.</Text>
        ) : (
          <View style={styles.row}>
            {days.map((day, index) => {
              const height = Math.max(8, Math.min(day.avg / SCALE_MAX, 1) * 52);
              return (
                <View
                  key={day.day}
                  style={styles.item}
                  accessibilityLabel={`${shortDate(day.day)}, AQI ${day.avg}`}
                >
                  <Text style={[styles.day, index === 0 && styles.today]}>
                    {index === 0 ? 'Hari ini' : dayLabel(day.day)}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor:
                            day.avg <= 50
                              ? colors.good
                              : day.avg <= 100
                                ? colors.caution
                                : '#f0863c',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.value}>{Math.round(day.avg)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    block: {
      gap: 14,
    },
    card: {
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
    },
    item: {
      flex: 1,
      alignItems: 'center' as const,
      gap: 5,
    },
    day: {
      ...typo.micro,
      color: colors.mutedText,
      textAlign: 'center' as const,
    },
    today: {
      fontFamily: font.bold,
      color: colors.ink,
    },
    barTrack: {
      height: 52,
      justifyContent: 'flex-end' as const,
    },
    bar: {
      width: 8,
      borderRadius: 4,
    },
    value: {
      ...typo.micro,
      fontFamily: font.bold,
      color: colors.ink,
    },
    empty: {
      ...typo.caption,
      color: colors.mutedText,
      paddingVertical: 12,
      textAlign: 'center' as const,
    },
  };
}
