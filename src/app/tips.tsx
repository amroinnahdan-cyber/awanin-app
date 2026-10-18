import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Activity, ArrowLeft, Clock, HeartPulse, ShieldCheck, Wind } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Card } from '@/components/ui';
import { useCurrentAir } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { useBackOrHome } from '@/lib/navigation';
import { categoryFor } from '@/lib/aqi';
import { color, radius, spacing, type as typo } from '@/theme/tokens';

/**
 * Figma node 2027:8473 exposes only the frame (the API never returned its children
 * because of rate limiting), so the layout follows the other sub-screens and the
 * copy is general air-quality guidance rather than text lifted from the file.
 */
const TIPS = [
  {
    key: 'rentan',
    icon: HeartPulse,
    title: 'Kenali kelompok rentan',
    body: 'Anak-anak, lansia, ibu hamil, serta penderita asma dan gangguan jantung paling cepat terpengaruh polusi.',
  },
  {
    key: 'waktu',
    icon: Clock,
    title: 'Atur waktu beraktivitas',
    body: 'Konsentrasi polutan biasanya memuncak siang hingga sore. Olahraga luar ruang lebih aman pagi hari.',
  },
  {
    key: 'masker',
    icon: ShieldCheck,
    title: 'Pakai masker bila perlu',
    body: 'Masker respirator (N95) lebih efektif menahan partikel halus PM2.5 dibanding masker kain.',
  },
  {
    key: 'ruang',
    icon: Wind,
    title: 'Jaga udara dalam ruang',
    body: 'Saat indeks tinggi, tutup jendela, bersihkan filter AC, dan hindari pembakaran di dalam ruang.',
  },
  {
    key: 'pantau',
    icon: Activity,
    title: 'Pantau indeks setiap hari',
    body: 'Kategori Baik sampai Sedang umumnya aman untuk sebagian besar orang. Cek Awanin sebelum keluar.',
  },
];

export default function TipsScreen() {
  const topInset = useTopInset();
  const goBack = useBackOrHome();
  const air = useCurrentAir();
  const category = categoryFor(air.data?.aqi ?? 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={12}
          onPress={goBack}
        >
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Tips Kesehatan</Text>
      </View>

      <View style={styles.sections}>
        <Card style={[styles.status, { borderLeftColor: category.color }]}>
          <Text style={styles.statusLabel}>
            {air.data ? `Kategori saat ini: ${category.label}` : 'Memuat kategori…'}
          </Text>
          <Text style={styles.statusBody}>
            {air.data
              ? category.message
              : 'Menghubungkan ke Open-Meteo untuk membaca kondisi terkini.'}
          </Text>
        </Card>

        {TIPS.map((tip) => (
          <Card key={tip.key} style={styles.tip}>
            <View style={styles.tipIcon}>
              <tip.icon size={20} color={color.accent} strokeWidth={1.8} />
            </View>
            <View style={styles.tipText}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          </Card>
        ))}

        <Text style={styles.disclaimer}>
          Panduan umum, bukan pengganti nasihat medis. Bila memiliki kondisi pernapasan,
          konsultasikan dengan tenaga kesehatan.
        </Text>
      </View>
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
  status: {
    padding: 16,
    gap: 4,
    borderLeftWidth: 4,
  },
  statusLabel: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  statusBody: {
    ...typo.body,
    color: color.mutedText,
  },
  tip: {
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: color.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    gap: 3,
  },
  tipTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  tipBody: {
    ...typo.body,
    color: color.mutedText,
  },
  disclaimer: {
    ...typo.micro,
    color: color.mutedText,
    textAlign: 'center',
  },
});