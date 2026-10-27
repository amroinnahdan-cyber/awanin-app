import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Line, Path } from 'react-native-svg';
import { ArrowLeft, ChevronDown, MapPin } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { Sheet, SheetRow } from '@/components/Sheet';
import { Card, Chip, InlineError, SectionTitle, Skeleton } from '@/components/ui';
import { useSelectedAir, useSelectedHistory } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, dayLabel, pollutantBand, readableOn } from '@/lib/aqi';
import { useAppState } from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/** Open-Meteo keeps 92 days of hourly history; 90 is the largest clean window. */
const CUSTOM_RANGES = [14, 60, 90];

const AXIS_WIDTH = 24;
const PLOT_WIDTH = 294;
const PLOT_HEIGHT = 140;
const Y_MAX = 200;
const Y_TICKS = [0, 50, 100, 150, 200];

function Chart({ points }: { points: { day: string; avg: number }[] }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  if (points.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Belum ada riwayat untuk periode ini.</Text>
      </View>
    );
  }

  const yFor = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), Y_MAX);
    return PLOT_HEIGHT - (clamped / Y_MAX) * (PLOT_HEIGHT - 16) - 8;
  };
  const step = points.length > 1 ? PLOT_WIDTH / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({ x: index * step, y: yFor(point.avg) }));

  const line = coords
    .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
    .join(' ');
  const area = `${line} L ${coords[coords.length - 1].x} ${PLOT_HEIGHT} L 0 ${PLOT_HEIGHT} Z`;
  const last = coords[coords.length - 1];

  return (
    <View style={styles.chartWrap}>
      <View style={{ width: AXIS_WIDTH }}>
        {Y_TICKS.slice()
          .reverse()
          .map((tick) => (
            <Text key={tick} style={[styles.yTick, { top: yFor(tick) - 7 }]}>
              {tick}
            </Text>
          ))}
      </View>
      <View>
        <Svg width={PLOT_WIDTH} height={PLOT_HEIGHT}>
          {Y_TICKS.map((tick) => (
            <Line
              key={tick}
              x1={0}
              x2={PLOT_WIDTH}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          <Path d={area} fill={colors.accent} fillOpacity={0.12} />
          <Path d={line} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
          {coords.map((coord, index) => (
            <Path
              key={points[index].day}
              d={`M ${coord.x} ${coord.y - 3} A 3 3 0 1 1 ${coord.x - 0.01} ${coord.y - 3} Z`}
              fill={categoryFor(points[index].avg).color}
            />
          ))}
        </Svg>

        {/* Value bubble on the newest point, as in the showcase */}
        <View
          style={[
            styles.tooltip,
            { left: Math.min(Math.max(last.x - 18, 0), PLOT_WIDTH - 36), top: last.y - 32 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipLabel}>{points[points.length - 1].avg}</Text>
        </View>

        <View style={styles.chartLabels}>
          {points.map((point, index) => (
            <Text
              key={point.day}
              style={[
                styles.chartLabel,
                {
                  left: index * step,
                  color:
                    points.length <= 7 ||
                    index === 0 ||
                    index === points.length - 1 ||
                    index % 5 === 0
                      ? colors.mutedText
                      : 'transparent',
                },
              ]}
            >
              {dayLabel(point.day)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function RiwayatScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { selected } = useAppState();
  const [range, setRange] = useState<number>(7);
  const [customOpen, setCustomOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const history = useSelectedHistory(range);
  const air = useSelectedAir();
  const isCustom = range !== 7 && range !== 30;

  const days = history.data ?? [];
  const averages = days.map((day) => day.avg);
  const mean = averages.length
    ? Math.round((averages.reduce((total, value) => total + value, 0) / averages.length) * 10) / 10
    : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          // `force` matters here: the daily series is cached for 15 minutes, so
          // without it a pull returned the exact same bars.
          refreshing={history.refreshing || air.refreshing}
          onRefresh={() => {
            void history.reload({ force: true });
            void air.reload({ force: true });
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Beranda"
          hitSlop={12}
          onPress={() => router.navigate('/')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Riwayat Kualitas Udara</Text>
      </View>

      <View style={styles.sections}>
        <View style={styles.periods}>
          <Chip label="7 Hari" active={range === 7} onPress={() => setRange(7)} />
          <Chip label="30 Hari" active={range === 30} onPress={() => setRange(30)} />
          <Chip
            label={isCustom ? `${range} Hari` : 'Kustom'}
            active={isCustom}
            onPress={() => setCustomOpen(true)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ganti lokasi, sekarang ${selected.name}`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <MapPin size={18} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.pickerValue}>{selected.name}</Text>
          <ChevronDown size={18} color={colors.accent} strokeWidth={1.8} />
        </Pressable>

        {history.error && !history.data ? (
          <InlineError message={history.error} onRetry={() => void history.reload()} />
        ) : (
          <Card style={styles.historyCard}>
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryCaption}>Rata-rata AQI</Text>
                {history.data ? (
                  <Text style={styles.summaryValue}>{mean}</Text>
                ) : (
                  <Skeleton width={54} height={20} style={styles.summarySkeleton} />
                )}
              </View>
              {history.data ? (
                <View style={[styles.summaryBadge, { backgroundColor: categoryFor(mean).color }]}>
                  <Text
                    style={[
                      styles.summaryBadgeLabel,
                      { color: readableOn(categoryFor(mean).color) },
                    ]}
                  >
                    {categoryFor(mean).short}
                  </Text>
                </View>
              ) : null}
            </View>

            <Chart points={days} />

            <View style={styles.legend}>
              {[
                { label: 'Baik', color: colors.good },
                { label: 'Sedang', color: colors.caution },
                { label: 'Tidak Sehat', color: '#f0863c' },
              ].map((entry) => (
                <View key={entry.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
                  <Text style={styles.legendLabel}>{entry.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <SectionTitle title="Detail Polutan" />

        <Card style={styles.pollutants}>
          {(air.data?.pollutants ?? []).map((pollutant) => (
            <View key={pollutant.key} style={styles.pollutantRow}>
              <View
                style={[
                  styles.pollutantDot,
                  { backgroundColor: pollutantBand(pollutant.key, pollutant.value).color },
                ]}
              />
              <Text style={styles.pollutantName}>{pollutant.label}</Text>
              <Text style={styles.pollutantValue}>
                {pollutant.value} {pollutant.unit}
              </Text>
            </View>
          ))}
          {air.error && !air.data ? (
            <InlineError message={air.error} onRetry={() => void air.reload()} />
          ) : null}
          {!air.data && !air.error ? (
            <Text style={styles.pollutantCaption}>Memuat pembacaan polutan…</Text>
          ) : null}
        </Card>

        <Text style={styles.credit}>Data kualitas udara & cuaca oleh Open-Meteo</Text>
      </View>

      <Sheet
        visible={customOpen}
        title="Rentang kustom"
        subtitle="Open-Meteo menyimpan hingga 92 hari ke belakang"
        onClose={() => setCustomOpen(false)}
      >
        {CUSTOM_RANGES.map((value) => (
          <SheetRow
            key={value}
            label={`${value} hari terakhir`}
            hint={value === 90 ? 'Rentang terpanjang yang tersedia' : undefined}
            value={range === value ? 'Dipilih' : undefined}
            onPress={() => {
              setRange(value);
              setCustomOpen(false);
            }}
          />
        ))}
      </Sheet>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingBottom: 40,
    },
    header: {
      height: 56,
      paddingHorizontal: spacing.gutter,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    headerTitle: {
      ...typo.title,
      flex: 1,
      color: colors.ink,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      gap: spacing.section,
    },
    periods: {
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      padding: 4,
      flexDirection: 'row' as const,
      gap: 4,
    },
    picker: {
      height: 42,
      borderRadius: radius.control,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 9,
    },
    pickerValue: {
      ...typo.bodyStrong,
      flex: 1,
      color: colors.ink,
    },
    historyCard: {
      padding: 16,
      gap: 14,
    },
    summary: {
      height: 61,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    summaryBadge: {
      borderRadius: 100,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    summaryBadgeLabel: {
      ...typo.caption,
      fontFamily: font.bold,
      fontSize: 12,
    },
    summaryCaption: {
      ...typo.caption,
      color: colors.mutedText,
    },
    summaryValue: {
      ...typo.title,
      color: colors.ink,
    },
    pressed: {
      opacity: 0.65,
    },
    summarySkeleton: {
      marginTop: 4,
    },
    chartWrap: {
      flexDirection: 'row' as const,
      gap: 4,
    },
    yTick: {
      position: 'absolute' as const,
      right: 4,
      ...typo.micro,
      color: colors.mutedText,
      textAlign: 'right' as const,
    },
    tooltip: {
      position: 'absolute' as const,
      minWidth: 36,
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    tooltipLabel: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.onAccent,
    },
    credit: {
      ...typo.micro,
      color: colors.mutedText,
      textAlign: 'center' as const,
    },
    chartEmpty: {
      height: 180,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    chartEmptyText: {
      ...typo.body,
      color: colors.mutedText,
    },
    chartLabels: {
      height: 14,
    },
    chartLabel: {
      position: 'absolute' as const,
      ...typo.micro,
      textAlign: 'center' as const,
    },
    legend: {
      height: 13,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 18,
    },
    legendItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      ...typo.micro,
      color: colors.mutedText,
    },
    pollutants: {
      padding: 16,
      gap: 14,
    },
    pollutantRow: {
      height: 17,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    pollutantDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    pollutantName: {
      ...typo.stat,
      flex: 1,
      color: colors.mutedText,
    },
    pollutantValue: {
      ...typo.stat,
      fontFamily: font.bold,
      textAlign: 'right' as const,
      color: colors.ink,
    },
    pollutantCaption: {
      ...typo.caption,
      color: colors.mutedText,
    },
  };
}
