import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ArrowLeft, Droplets, Leaf, ShieldCheck, Wind } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Card } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import { useBackOrHome } from '@/lib/navigation';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

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

export default function TipsScreen() {
  const topInset = useTopInset();
  const goBack = useBackOrHome();

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
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
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

        {TIPS.map((tip) => (
          <Card key={tip.key} style={styles.tip}>
            <View style={styles.tipIcon}>
              <tip.icon size={20} color={color.accent} strokeWidth={1.8} />
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
            <Wind size={19} color={color.accent} strokeWidth={1.8} />
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
  pressed: {
    opacity: 0.6,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    gap: 14,
  },
  mascotWrap: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: color.sky,
  },
  mascot: {
    width: '100%',
    height: 170,
  },
  intro: {
    gap: 4,
    marginTop: 4,
  },
  introTitle: {
    ...typo.title,
    color: color.ink,
  },
  introBody: {
    ...typo.body,
    color: color.mutedText,
  },
  tip: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    ...typo.body,
    flex: 1,
    color: color.mutedText,
    lineHeight: 18,
  },
  tipTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  banner: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    ...typo.bodyStrong,
    flex: 1,
    color: color.ink,
    fontFamily: font.bold,
  },
  disclaimer: {
    ...typo.micro,
    color: color.mutedText,
    textAlign: 'center',
    marginTop: 4,
  },
});
