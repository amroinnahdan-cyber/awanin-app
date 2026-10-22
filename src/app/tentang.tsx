import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, ExternalLink } from 'lucide-react-native';

import { InfoParagraph, InfoScreen, InfoSection } from '@/components/InfoScreen';
import { ATTRIBUTION } from '@/api/openMeteo';
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { openUrl } from '@/lib/share';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

const FACTS = [
  { label: 'Versi', value: '1.1.0 (Expo)' },
  { label: 'Sumber data', value: 'Open-Meteo' },
  { label: 'Skala indeks', value: 'US AQI (0–500)' },
  { label: 'Backend', value: 'Awanin API (opsional)' },
  { label: 'Lokasi dipantau', value: '5 titik + GPS + 100 kota' },
];

export default function TentangScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <InfoScreen title="Tentang Awanin" subtitle="Pemantau kualitas udara Jakarta">
      <InfoSection>
        <View style={styles.identity}>
          <LinearGradient colors={[colors.sky, colors.tint]} style={styles.badge}>
            <Text style={styles.badgeLetter}>A</Text>
          </LinearGradient>
          <View style={styles.identityText}>
            <Text style={styles.name}>Awanin</Text>
            <Text style={styles.tagline}>Know Your Air</Text>
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
          {ATTRIBUTION}. Data diambil lewat backend Awanin bila tersedia (cache 10 menit), atau
          langsung ke Open-Meteo bila server tidak dikonfigurasi/dijangkau. Riwayat disimpan 15
          menit; pembacaan terakhir juga disimpan di perangkat untuk mode offline.
        </InfoParagraph>
        <InfoParagraph>
          Indeks yang ditampilkan adalah US AQI, skala yang dipakai Open-Meteo untuk parameter
          PM2.5, dengan ambang 50 / 100 / 150 / 200 / 300.
        </InfoParagraph>
        <InfoParagraph>
          Layar “Indonesia” membaca {INDONESIA_CITIES.length} kota di 38 provinsi dalam satu
          permintaan (koordinat dipisah koma) dan menyimpannya 10 menit. Daftar kota berasal dari
          GeoNames (CC BY 4.0).
        </InfoParagraph>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Buka open-meteo.com"
          onPress={() => void openUrl('https://open-meteo.com/')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>open-meteo.com</Text>
          <ExternalLink size={15} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Buka geonames.org"
          onPress={() => void openUrl('https://www.geonames.org/')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>geonames.org</Text>
          <ExternalLink size={15} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
      </InfoSection>

      <InfoSection title="Prakiraan & peringatan" delay={120}>
        <InfoParagraph>
          Prakiraan tujuh hari dihitung dari deret hourly us_aqi (API kualitas udara tidak punya
          blok daily). Server memeriksa lima lokasi tiap 15 menit, menyimpan tren, dan mengirim
          push Expo saat kategori AQI memburuk melewati ambang perangkat.
        </InfoParagraph>
        <InfoParagraph>
          Push jarak jauh memerlukan development build dengan projectId EAS; Expo Go tidak
          mendukungnya. Aplikasi tetap berfungsi penuh tanpa push.
        </InfoParagraph>
      </InfoSection>

      <InfoSection title="Catatan resolusi" delay={180}>
        <InfoParagraph>
          Model kualitas udara Open-Meteo punya resolusi grid sekitar 11 km. Jakarta Pusat, Monas,
          dan Bundaran HI berada di dalam sel grid yang sama, sehingga angkanya bisa identik
          — itu batas resolusi sumber data, bukan kesalahan pembacaan. GBK dan Kota Tua jatuh di
          sel tetangga dan karena itu sering berbeda.
        </InfoParagraph>
      </InfoSection>

      <InfoSection title="Dibuat dengan" delay={240}>
        <InfoParagraph>
          Expo + React Native, TypeScript, react-native-svg untuk gauge dan grafik, serta
          Express + SQLite untuk backend. Desain mengikuti file Figma “Awanin — Mobile App” dengan
          penyesuaian kontras aksesibilitas dan dukungan mode gelap.
        </InfoParagraph>
      </InfoSection>

      <InfoSection title="Lainnya" delay={300}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Privasi & keamanan"
          onPress={() => router.push('/privasi')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>Privasi & keamanan</Text>
          <ChevronRight size={15} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Bantuan"
          onPress={() => router.push('/bantuan')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>Bantuan</Text>
          <ChevronRight size={15} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Tips Kesehatan"
          onPress={() => router.push('/tips')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>Tips Kesehatan</Text>
          <ChevronRight size={15} color={colors.accent} strokeWidth={1.8} />
        </Pressable>
      </InfoSection>
    </InfoScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    identity: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 13,
      paddingBottom: spacing.section,
    },
    badge: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badgeLetter: {
      fontFamily: font.extrabold,
      fontSize: 24,
      lineHeight: 30,
      color: colors.accent,
    },
    identityText: {
      gap: 2,
    },
    name: {
      ...typo.heading,
      color: colors.ink,
    },
    tagline: {
      ...typo.caption,
      color: colors.mutedText,
    },
    facts: {
      gap: 8,
    },
    factRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
    },
    factLabel: {
      ...typo.body,
      color: colors.mutedText,
    },
    factValue: {
      ...typo.body,
      fontFamily: font.bold,
      color: colors.ink,
    },
    link: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingTop: 2,
    },
    linkLabel: {
      ...typo.bodyStrong,
      color: colors.accent,
      textDecorationLine: 'underline' as const,
    },
    pressed: {
      opacity: 0.6,
    },
  };
}
