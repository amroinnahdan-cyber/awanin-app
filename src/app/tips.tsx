import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { ArrowLeft, Droplets, Leaf, ShieldCheck, Wind } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Card } from '@/components/ui';
import { useSelectedAir } from '@/hooks/useAirQuality';
import { useTopInset } from '@/hooks/useTopInset';
import { categoryFor } from '@/lib/aqi';
import { useBackOrHome } from '@/lib/navigation';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

/** The four tips from the design showcase. */
const TIPS = [
  {
    key: 'masker',
    icon: ShieldCheck,
    title: 'Gunakan masker',
    body: 'saat kualitas udara menurun (terutama PM2.5).',
  },
  {
    key: 'aktivitas',
    icon: Wind,
    title: 'Kurangi aktivitas berat',
    body: 'di luar ruangan saat AQI tinggi.',
  },
  {
    key: 'air',
    icon: Droplets,
    title: 'Perbanyak minum air putih',
    body: 'agar tubuh tetap terhidrasi.',
  },
  {
    key: 'tanaman',
    icon: Leaf,
    title: 'Gunakan tanaman',
    body: 'penyaring udara di dalam ruangan.',
  },
];

/** Extra guidance that only makes sense for the category being shown. */
function adviceFor(aqi: number): string {
  if (aqi <= 50) return 'Aman untuk aktivitas luar ruangan. Manfaatkan udara bersih hari ini.';
  if (aqi <= 100) {
    return 'Kelompok sensitif sebaiknya mengurangi olahraga berat di luar. Selain itu aman.';
  }
  if (aqi <= 150) {
    return 'Batasi aktivitas luar untuk anak, lansia, dan penderita asma. Pakai masker bila keluar.';
  }
  if (aqi <= 200) {
    return 'Hindari olahraga luar ruangan. Tutup jendela dan nyalakan penyaring udara.';
  }
  return 'Tetap di dalam ruangan. Jika harus keluar, gunakan masker N95 dan hindari jalan kaki lama.';
}

export default function TipsScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const goBack = useBackOrHome();
  const air = useSelectedAir();
  const reading = air.data;
  const category = reading ? categoryFor(reading.aqi) : null;

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
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Tips Kesehatan</Text>
      </View>

      <View style={styles.sections}>
        <View style={styles.mascotWrap}>
          <Image
            source={require('../../assets/img-mascot.jpg')}
            style={styles.mascot}
            resizeMode="cover"
          />
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Tips hari ini</Text>
          <Text style={styles.introBody}>
            Lindungi diri dari polusi udara dengan kebiasaan sederhana berikut:
          </Text>
        </View>

        {reading && category ? (
          <Card tone="tint" style={styles.advice}>
            <View style={[styles.adviceBadge, { backgroundColor: category.color }]}>
              <Text style={[styles.adviceBadgeLabel, { color: '#ffffff' }]}>
                AQI {reading.aqi}
              </Text>
            </View>
            <View style={styles.adviceText}>
              <Text style={styles.adviceTitle}>{category.label}</Text>
              <Text style={styles.adviceBody}>{adviceFor(reading.aqi)}</Text>
            </View>
          </Card>
        ) : null}

        {TIPS.map((tip) => (
          <Card key={tip.key} style={styles.tip}>
            <View style={styles.tipIcon}>
              <tip.icon size={20} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text style={styles.tipText}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              {'\n'}
              {tip.body}
            </Text>
          </Card>
        ))}

        <Card tone="tint" style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Wind size={19} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text style={styles.bannerText}>Udara bersih, masa depan lebih baik.</Text>
        </Card>

        <Text style={styles.disclaimer}>
          Panduan umum, bukan pengganti nasihat medis. Bila memiliki kondisi pernapasan,
          konsultasikan dengan tenaga kesehatan.
        </Text>
      </View>
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
    pressed: {
      opacity: 0.6,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      gap: 14,
    },
    mascotWrap: {
      borderRadius: radius.card,
      overflow: 'hidden' as const,
      backgroundColor: colors.sky,
    },
    mascot: {
      width: '100%' as const,
      height: 170,
    },
    intro: {
      gap: 4,
      marginTop: 4,
    },
    introTitle: {
      ...typo.title,
      color: colors.ink,
    },
    introBody: {
      ...typo.body,
      color: colors.mutedText,
    },
    advice: {
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    adviceBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    adviceBadgeLabel: {
      ...typo.caption,
      fontFamily: font.bold,
    },
    adviceText: {
      flex: 1,
      gap: 2,
    },
    adviceTitle: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    adviceBody: {
      ...typo.caption,
      color: colors.mutedText,
    },
    tip: {
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    tipIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    tipText: {
      ...typo.body,
      flex: 1,
      color: colors.mutedText,
      lineHeight: 18,
    },
    tipTitle: {
      ...typo.bodyStrong,
      color: colors.ink,
    },
    banner: {
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginTop: 4,
    },
    bannerIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    bannerText: {
      ...typo.bodyStrong,
      flex: 1,
      color: colors.ink,
      fontFamily: font.bold,
    },
    disclaimer: {
      ...typo.micro,
      color: colors.mutedText,
      textAlign: 'center' as const,
      marginTop: 4,
    },
  };
}
