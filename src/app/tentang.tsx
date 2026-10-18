import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExternalLink } from 'lucide-react-native';

import { InfoParagraph, InfoScreen, InfoSection } from '@/components/InfoScreen';
import { ATTRIBUTION } from '@/api/openMeteo';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

const FACTS = [
  { label: 'Versi', value: '1.0.0 (Expo)' },
  { label: 'Sumber data', value: 'Open-Meteo' },
  { label: 'Skala indeks', value: 'US AQI (0–500)' },
  { label: 'Lokasi dipantau', value: '5 titik di Jakarta' },
];

export default function TentangScreen() {
  return (
    <InfoScreen title="Tentang Awanin" subtitle="Kualitas udara Jakarta, setiap saat">
      <InfoSection>
        <View style={styles.identity}>
          <LinearGradient colors={[color.sky, color.tint]} style={styles.badge}>
            <Text style={styles.badgeLetter}>A</Text>
          </LinearGradient>
          <View style={styles.identityText}>
            <Text style={styles.name}>Awanin</Text>
            <Text style={styles.tagline}>Pemantau kualitas udara Jakarta</Text>
          </View>
        </View>

        <View style={styles.facts}>
          {FACTS.map((fact) => (
            <View key={fact.label} style={styles.factRow}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.factValue}>{fact.value}</Text>
            </View>
          ))}
        </View>
      </InfoSection>

      <InfoSection title="Sumber data" delay={60}>
        <InfoParagraph>
          {ATTRIBUTION}. Data diambil langsung dari API publik Open-Meteo saat layar dibuka dan
          disimpan sebentar di memori (5 menit untuk pembacaan terkini, 15 menit untuk riwayat),
          jadi membuka beberapa tab tidak membanjiri server mereka.
        </InfoParagraph>
        <InfoParagraph>
          Indeks yang ditampilkan adalah US AQI, skala yang dipakai Open-Meteo untuk parameter
          PM2.5, dengan ambang 50 / 100 / 150 / 200 / 300.
        </InfoParagraph>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Buka open-meteo.com"
          onPress={() => void Linking.openURL('https://open-meteo.com/')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>open-meteo.com</Text>
          <ExternalLink size={15} color={color.accent} strokeWidth={1.8} />
        </Pressable>
      </InfoSection>

      <InfoSection title="Catatan resolusi" delay={120}>
        <InfoParagraph>
          Model kualitas udara Open-Meteo punya resolusi grid sekitar 11 km. Jakarta Pusat, Monas,
          Menteng, dan Kota Tua berada di dalam sel grid yang sama, sehingga angkanya bisa identik
          — itu batas resolusi sumber data, bukan kesalahan pembacaan. Sudirman jatuh di sel
          tetangga dan karena itu sering berbeda.
        </InfoParagraph>
      </InfoSection>

      <InfoSection title="Dibuat dengan" delay={180}>
        <InfoParagraph>
          Expo + React Native, TypeScript, dan react-native-svg untuk gauge dan grafiknya. Desain
          mengikuti file Figma “Awanin — Mobile App” dengan penyesuaian kontras aksesibilitas.
        </InfoParagraph>
      </InfoSection>
    </InfoScreen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingBottom: spacing.section,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    fontFamily: font.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: color.accent,
  },
  identityText: {
    gap: 2,
  },
  name: {
    ...typo.heading,
    color: color.ink,
  },
  tagline: {
    ...typo.caption,
    color: color.mutedText,
  },
  facts: {
    gap: 8,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  factLabel: {
    ...typo.body,
    color: color.mutedText,
  },
  factValue: {
    ...typo.body,
    fontFamily: font.bold,
    color: color.ink,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  linkLabel: {
    ...typo.bodyStrong,
    color: color.accent,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
});
