import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Line, Path } from 'react-native-svg';
import { ArrowLeft, ChevronDown, MapPin } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { Sheet, SheetRow } from '@/components/Sheet';
import { Card, Chip, InlineError, SectionTitle, Skeleton } from '@/components/ui';
import { useSelectedAir, useSelectedHistory } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor, dayLabel, pollutantBand } from '@/lib/aqi';
import { useAppState } from '@/state/app';
import { color, radius, spacing, type as typo } from '@/theme/tokens';

/** Open-Meteo keeps 92 days of hourly history; 90 is the largest clean window. */
const CUSTOM_RANGES = [14, 60, 90];

/** AQI 100 is the first "unhealthy for sensitive groups" boundary. */
const SENSITIVE_THRESHOLD = 100;

const PLOT_WIDTH = 318;
const PLOT_HEIGHT = 140;

function Chart({ points }: { points: { day: string; avg: number }[] }) {
  if (points.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Belum ada riwayat untuk periode ini.</Text>
      </View>
    );
  }

  const values = points.map((point) => point.avg);
  // Always include the 100 threshold in the window, so a flat "good" week still
  // shows how far below the sensitive-group boundary it sat.
  const min = Math.min(...values, SENSITIVE_THRESHOLD);
  const max = Math.max(...values, SENSITIVE_THRESHOLD + 1);
  const span = Math.max(max - min, 1);

  const yFor = (value: number) => PLOT_HEIGHT - ((value - min) / span) * (PLOT_HEIGHT - 16) - 8;
  const step = points.length > 1 ? PLOT_WIDTH / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({ x: index * step, y: yFor(point.avg) }));
  const thresholdY = yFor(SENSITIVE_THRESHOLD);

  const line = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1].x} ${PLOT_HEIGHT} L 0 ${PLOT_HEIGHT} Z`;

  return (
    <View>
      <Svg width={PLOT_WIDTH} height={PLOT_HEIGHT}>
        {[0, 0.5, 1].map((ratio) => (
          <Line
            key={ratio}
            x1={0}
            x2={PLOT_WIDTH}
            y1={ratio * (PLOT_HEIGHT - 16) + 8}
            y2={ratio * (PLOT_HEIGHT - 16) + 8}
            stroke={color.border}
            strokeWidth={1}
          />
        ))}
        <Line
          x1={0}
          x2={PLOT_WIDTH}
          y1={thresholdY}
          y2={thresholdY}
          stroke={color.caution}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Path d={area} fill={color.accent} fillOpacity={0.12} />
        <Path d={line} stroke={color.accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {coords.map((coord, index) => (
          <Path
            key={points[index].day}
            d={`M ${coord.x} ${coord.y - 3} A 3 3 0 1 1 ${coord.x - 0.01} ${coord.y - 3} Z`}
            fill={categoryFor(points[index].avg).color}
          />
        ))}
      </Svg>
      <Text style={[styles.thresholdLabel, { top: thresholdY - 13 }]}>Ambang 100</Text>
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
                    ? color.mutedText
                    : 'transparent',
              },
            ]}
          >
            {dayLabel(point.day)}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function RiwayatScreen() {
  const topInset = useTopInset();
  const { selected } = useAppState();
  const [range, setRange] = useState<number>(7);
  const [customOpen, setCustomOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const history = useSelectedHistory(range);
  const air = useSelectedAir();
  const isCustom = range !== 7 && range !== 30;
  const periodLabel = `${range} hari`;

  const days = history.data ?? [];
  const averages = days.map((day) => day.avg);
  const mean = averages.length
    ? Math.round((averages.reduce((total, value) => total + value, 0) / averages.length) * 10) / 10
    : 0;
  const first = averages[0] ?? 0;
  const last = averages[averages.length - 1] ?? 0;
  const delta = Math.round((last - first) * 10) / 10;
  const improving = delta <= 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
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
          <MapPin size={18} color={color.accent} strokeWidth={1.8} />
          <Text style={styles.pickerValue}>{selected.name}</Text>
          <ChevronDown size={18} color={color.accent} strokeWidth={1.8} />
        </Pressable>

        {history.error && !history.data ? (
          <InlineError message={history.error} onRetry={() => void history.reload()} />
        ) : (
          <Card style={styles.historyCard}>
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryCaption}>Rata-rata {periodLabel}</Text>
                {history.data ? (
                  <Text style={styles.summaryValue}>{mean}</Text>
                ) : (
                  <Skeleton width={54} height={20} style={styles.summarySkeleton} />
                )}
              </View>
              <View style={styles.summaryTrend}>
                <Text style={styles.summaryCaption}>Tren</Text>
                <Text style={[styles.trendValue, { color: improving ? color.good : color.caution }]}>
                  {history.data ? `${improving ? '▼' : '▲'} ${Math.abs(delta)}` : '—'}
                </Text>
              </View>
            </View>

            <Chart points={days} />

            <View style={styles.legend}>
              {[
                { label: 'Baik', color: color.good },
                { label: 'Sedang', color: color.caution },
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
              <Text style={styles.pollutantName}>{pollutant.label}</Text>
              <View style={styles.pollutantTrack}>
                <View
                  style={[
                    styles.pollutantFill,
                    {
                      width: `${pollutantBand(pollutant.key, pollutant.value).progress * 100}%`,
                      backgroundColor: pollutantBand(pollutant.key, pollutant.value).color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.pollutantValue}>{pollutant.value}</Text>
            </View>
          ))}
          {air.error && !air.data ? (
            <InlineError message={air.error} onRetry={() => void air.reload()} />
          ) : null}
          {!air.data && !air.error ? (          <Text style={styles.pollutantCaption}>
            Memuat pembacaan polutan…
          </Text>
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
        {CUSTOM_RANGES.map((days) => (
          <SheetRow
            key={days}
            label={`${days} hari terakhir`}
            hint={days === 90 ? 'Rentang terpanjang yang tersedia' : undefined}
            value={range === days ? 'Dipilih' : undefined}
            onPress={() => {
              setRange(days);
              setCustomOpen(false);
            }}
          />
        ))}
      </Sheet>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    ...typo.title,
    flex: 1,
    color: color.ink,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.section,
  },
  periods: {
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: color.tint,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  picker: {
    height: 42,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  pickerValue: {
    ...typo.bodyStrong,
    flex: 1,
    color: color.ink,
  },
  historyCard: {
    padding: 16,
    gap: 14,
  },
  summary: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTrend: {
    alignItems: 'flex-end',
  },
  summaryCaption: {
    ...typo.caption,
    color: color.mutedText,
  },
  summaryValue: {
    ...typo.title,
    color: color.ink,
  },
  trendValue: {
    ...typo.heading,
  },
  pressed: {
    opacity: 0.65,
  },
  summarySkeleton: {
    marginTop: 4,
  },
  thresholdLabel: {
    position: 'absolute',
    right: 0,
    ...typo.micro,
    color: color.caution,
  },
  credit: {
    ...typo.micro,
    color: color.mutedText,
    textAlign: 'center',
  },
  chartEmpty: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    ...typo.body,
    color: color.mutedText,
  },
  chartLabels: {
    height: 14,
  },
  chartLabel: {
    position: 'absolute',
    ...typo.micro,
    textAlign: 'center',
  },
  legend: {
    height: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...typo.micro,
    color: color.mutedText,
  },
  pollutants: {
    padding: 16,
    gap: 14,
  },
  pollutantRow: {
    height: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollutantName: {
    ...typo.stat,
    width: 60,
    color: color.mutedText,
  },
  pollutantTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.tint,
    overflow: 'hidden',
  },
  pollutantFill: {
    height: 8,
    borderRadius: 4,
  },
  pollutantValue: {
    ...typo.stat,
    minWidth: 48,
    textAlign: 'right',
    color: color.ink,
  },
  pollutantCaption: {
    ...typo.caption,
    color: color.mutedText,
  },
});