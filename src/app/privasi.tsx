import { StyleSheet, Text, View } from 'react-native';

import { InfoParagraph, InfoScreen, InfoSection } from '@/components/InfoScreen';
import { LinkRow } from '@/components/LinkRow';
import { ATTRIBUTION } from '@/api/openMeteo';
import { color, type as typo } from '@/theme/tokens';

const POINTS = [
  'Tidak ada akun, login, atau token di aplikasi ini.',
  'Tidak ada analitik, iklan, maupun SDK pelacak pihak ketiga.',
  'Lokasi yang kamu pilih disimpan di memori sesi, bukan dikirim ke server mana pun.',
  'Tidak ada izin GPS yang diminta: titik-titik yang dipantau sudah ditentukan.',
];

export default function PrivasiScreen() {
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
          Hanya permintaan cuaca dan kualitas udara ke Open-Meteo dengan koordinat lokasi yang kamu
          pilih. Tidak ada identitas pengguna yang ikut terkirim.
        </InfoParagraph>
        <InfoParagraph>{ATTRIBUTION}.</InfoParagraph>
      </InfoSection>

      <InfoSection title="Masa simpan" delay={120}>
        <InfoParagraph>
          Pilihan lokasi, favorit, dan pengaturan hidup selama aplikasi berjalan. Menutup aplikasi
          atau memuat ulang halaman mengembalikannya ke keadaan awal — karena itu layar Profil →
          Keluar tidak menghapus apa pun di server.
        </InfoParagraph>
      </InfoSection>

      <InfoSection title="Izin" delay={180}>
        <InfoParagraph>
          Awanin tidak meminta izin notifikasi, kamera, mikrofon, maupun kontak. Notifikasi di
          dalam aplikasi hanyalah daftar perubahan yang tercatat selama sesi berjalan.
        </InfoParagraph>
      </InfoSection>

      <InfoSection delay={240}>
        <LinkRow label="Tentang Awanin" href="/tentang" />
        <LinkRow label="Kembali ke Bantuan" href="/bantuan" />
      </InfoSection>
    </InfoScreen>
  );
}

const styles = StyleSheet.create({
  point: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.accent,
    marginTop: 7,
  },
  pointText: {
    ...typo.body,
    flex: 1,
    color: color.mutedText,
  },
});
