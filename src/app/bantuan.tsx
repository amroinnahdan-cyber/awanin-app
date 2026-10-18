import { StyleSheet, Text, View } from 'react-native';

import { InfoFaq, InfoParagraph, InfoScreen, InfoSection } from '@/components/InfoScreen';
import { LinkRow } from '@/components/LinkRow';
import { color, type as typo } from '@/theme/tokens';

export default function BantuanScreen() {
  return (
    <InfoScreen title="Bantuan" subtitle="Pertanyaan yang paling sering muncul">
      <InfoSection title="Tentang angka AQI" delay={0}>
        <InfoFaq question="Seberapa sering datanya diperbarui?">
          Pembacaan terkini otomatis disegarkan tiap 5 menit dan saat kamu menarik layar Beranda ke
          bawah. Riwayat harian disimpan 15 menit. Waktu pembaruan terakhir selalu ditulis di bawah
          ring, misalnya “Diperbarui pukul 16.00 WIB”.
        </InfoFaq>
        <InfoFaq question="Kenapa beberapa lokasi menunjukkan angka yang sama?">
          Grid model udara Open-Meteo selebar ±11 km, jadi Jakarta Pusat, Monas, Menteng, dan Kota
          Tua jatuh di sel yang sama. Angka yang identik berarti titik-titik itu memang satu sel,
          bukan bug.
        </InfoFaq>
        <InfoFaq question="Apa arti warnanya?">
          Hijau (0–50) Baik, kuning (51–100) Sedang, oranye (101–150) Tidak Sehat untuk Sensitif,
          merah (151–200) Tidak Sehat, ungu (201–300) Sangat Tidak Sehat, merah tua (301–500)
          Berbahaya.
        </InfoFaq>
      </InfoSection>

      <InfoSection title="Memakai aplikasi" delay={60}>
        <InfoFaq question="Bagaimana mengganti lokasi?">
          Ketuk nama lokasi di Beranda, atau tombol kaca pembesar di Peta, atau nama lokasi di
          Riwayat — ketiganya membuka pemilih lokasi yang sama. Pilihan itu langsung dipakai semua
          layar.
        </InfoFaq>
        <InfoFaq question="Bagaimana menyimpan lokasi favorit?">
          Buka pemilih lokasi lalu ketuk ikon bintang di baris lokasi. Favorit bisa diatur ulang di
          Profil → Lokasi favorit.
        </InfoFaq>
        <InfoFaq question="Kenapa notifikasi kosong?">
          Notifikasi hanya dibuat saat kategori AQI berubah selama aplikasi berjalan. Sesi baru
          selalu mulai kosong — tidak ada riwayat palsu yang ditampilkan.
        </InfoFaq>
      </InfoSection>

      <InfoSection title="Masalah teknis" delay={120}>
        <InfoFaq question="Muncul “Data belum bisa dimuat”">
          Artinya permintaan ke Open-Meteo gagal (koneksi, atau batas pemakaian harian). Ketuk
          “Coba lagi”; data lama tetap ditampilkan bila sudah ada.
        </InfoFaq>
        <InfoParagraph>
          Batas gratis Open-Meteo adalah 10.000 permintaan per hari untuk pemakaian non-komersial.
        </InfoParagraph>
      </InfoSection>

      <InfoSection delay={180}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Masih butuh bantuan?</Text>
        </View>
        <LinkRow label="Buka Tentang Awanin" href="/tentang" />
        <LinkRow label="Baca kebijakan privasi" href="/privasi" />
      </InfoSection>
    </InfoScreen>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingBottom: 4,
  },
  footerText: {
    ...typo.body,
    color: color.mutedText,
  },
});
