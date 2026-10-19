import { Text, View } from 'react-native';

import { InfoParagraph, InfoScreen, InfoSection } from '@/components/InfoScreen';
import { LinkRow } from '@/components/LinkRow';
import { ATTRIBUTION } from '@/api/openMeteo';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { type as typo, type ThemeColors } from '@/theme/tokens';

const POINTS = [
  'Tidak ada akun, login, atau kata sandi.',
  'Tidak ada analitik, iklan, maupun SDK pelacak pihak ketiga.',
  'ID perangkat bersifat anonim dan dibuat acak di perangkat.',
  'GPS dan notifikasi hanya diminta bila kamu menekan tombolnya; keduanya bisa dilewati.',
];

export default function PrivasiScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <InfoScreen title="Privasi & keamanan" subtitle="Apa yang disimpan, dan apa yang tidak">
      <InfoSection title="Ringkasnya" delay={0}>
        {POINTS.map((point) => (
          <View key={point} style={styles.point}>
            <View style={styles.bullet} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </InfoSection>

      <InfoSection title="Data yang keluar dari perangkat" delay={60}>
        <InfoParagraph>
          Koordinat lokasi yang kamu pilih dikirim ke Open-Meteo untuk membaca cuaca dan kualitas
          udara. Bila backend Awanin aktif, koordinat dan ID perangkat anonim juga dipakai untuk
          cache server serta langganan peringatan — tanpa nama, email, atau identitas lain.
        </InfoParagraph>
        <InfoParagraph>{ATTRIBUTION}.</InfoParagraph>
      </InfoSection>

      <InfoSection title="Masa simpan" delay={120}>
        <InfoParagraph>
          Di perangkat: pilihan lokasi, favorit, preferensi tema, pembacaan terakhir, dan riwayat
          notifikasi disimpan di AsyncStorage/localStorage. Riwayat notifikasi dibatasi 20 entri.
        </InfoParagraph>
        <InfoParagraph>
          Di server: baris perangkat, preferensi peringatan, dan log notifikasi. Menekan
          “Keluar” di Profil menghapus baris perangkat beserta preferensinya dari server.
        </InfoParagraph>
      </InfoSection>

      <InfoSection title="Izin" delay={180}>
        <InfoParagraph>
          Notifikasi (opsional): untuk peringatan AQI dari server. Lokasi (opsional): untuk
          “Gunakan lokasi saya”. Tidak ada akses kamera, mikrofon, atau kontak.
        </InfoParagraph>
      </InfoSection>

      <InfoSection delay={240}>
        <LinkRow label="Tentang Awanin" href="/tentang" />
        <LinkRow label="Kembali ke Bantuan" href="/bantuan" />
      </InfoSection>
    </InfoScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    point: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    bullet: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginTop: 7,
    },
    pointText: {
      ...typo.body,
      flex: 1,
      color: colors.mutedText,
    },
  };
}
