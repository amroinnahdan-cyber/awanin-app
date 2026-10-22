import { Text, View } from 'react-native';

import { InfoFaq, InfoParagraph, InfoScreen, InfoSection } from '@/components/InfoScreen';
import { LinkRow } from '@/components/LinkRow';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { type as typo, type ThemeColors } from '@/theme/tokens';

export default function BantuanScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <InfoScreen title="Bantuan" subtitle="Pertanyaan yang paling sering muncul">
      <InfoSection title="Tentang angka AQI" delay={0}>
        <InfoFaq question="Seberapa sering datanya diperbarui?">
          Pembacaan terkini disegarkan tiap 5 menit di aplikasi dan tiap 10 menit di server, serta
          saat kamu menarik layar Beranda ke bawah. Riwayat harian disimpan 15 menit. Waktu
          pembaruan terakhir selalu ditulis di bawah ring.
        </InfoFaq>
        <InfoFaq question="Kenapa beberapa lokasi menunjukkan angka yang sama?">
          Grid model udara Open-Meteo selebar ±11 km, jadi Jakarta Pusat, Monas, dan Bundaran HI
          jatuh di sel yang sama. Angka yang identik berarti titik-titik itu memang satu sel,
          bukan bug. GBK dan Kota Tua ada di sel tetangga, jadi angkanya bisa berbeda.
        </InfoFaq>
        <InfoFaq question="Apa arti warnanya?">
          Hijau (0–50) Baik, kuning (51–100) Sedang, oranye (101–150) Tidak Sehat untuk Sensitif,
          merah (151–200) Tidak Sehat, ungu (201–300) Sangat Tidak Sehat, merah tua (301–500)
          Berbahaya.
        </InfoFaq>
      </InfoSection>

      <InfoSection title="Memakai aplikasi" delay={60}>
        <InfoFaq question="Bagaimana mengganti lokasi?">
          Ketuk nama lokasi di Beranda, baris lokasi di layar Sekitar, atau nama lokasi di Riwayat.
          Beranda dan Riwayat membuka pemilih lokasi yang sama; di Sekitar kamu bisa langsung memilih
          dari daftar yang diurutkan menurut jarak dari posisi perangkat.
        </InfoFaq>
        <InfoFaq question="Bagaimana menyimpan lokasi favorit?">
          Buka pemilih lokasi lalu ketuk ikon bintang di baris lokasi. Favorit bisa diatur ulang di
          Profil → Preferensi.
        </InfoFaq>
        <InfoFaq question="Kenapa notifikasi kosong?">
          Daftar “Terbaru di perangkat” hanya mencatat perubahan kategori AQI yang terlihat selama
          aplikasi terbuka. Notifikasi dari server muncul di bagian “Dari server”. Sesi baru selalu
          mulai tanpa riwayat palsu.
        </InfoFaq>
        <InfoFaq question="Bagaimana mengaktifkan mode gelap?">
          Profil → Preferensi → Tema. Pilihan “Sistem” mengikuti pengaturan perangkat; “Terang” dan
          “Gelap” mengunci tampilan.
        </InfoFaq>
      </InfoSection>

      <InfoSection title="Notifikasi & server" delay={120}>
        <InfoFaq question="Apa yang dikirim ke server Awanin?">
          Hanya ID perangkat anonim, token push Expo (bila notifikasi diizinkan), lokasi yang
          dipantau, dan pengaturan peringatan. Tidak ada nama, email, atau akun.
        </InfoFaq>
        <InfoFaq question="Kenapa push belum aktif?">
          Push jarak jauh membutuhkan development build dengan projectId EAS; Expo Go tidak
          mendukungnya. Tombol “Uji notifikasi” di layar Notifikasi akan menjelaskan statusnya.
        </InfoFaq>
        <InfoFaq question="Bagaimana kalau server tidak berjalan?">
          Aplikasi otomatis memakai Open-Meteo langsung. Pembacaan terakhir juga disimpan di
          perangkat dan ditampilkan dengan label “Data tersimpan” saat offline.
        </InfoFaq>
      </InfoSection>

      <InfoSection title="Masalah teknis" delay={180}>
        <InfoFaq question="Muncul “Data belum bisa dimuat”">
          Artinya permintaan ke server dan Open-Meteo sama-sama gagal, dan belum ada salinan
          tersimpan. Ketuk “Coba lagi”; data lama tetap ditampilkan bila ada.
        </InfoFaq>
        <InfoParagraph>
          Batas gratis Open-Meteo adalah 10.000 permintaan per hari untuk pemakaian non-komersial.
          Server Awanin menyimpan cache 10 menit agar batas itu tidak cepat habis.
        </InfoParagraph>
      </InfoSection>

      <InfoSection delay={240}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Masih butuh bantuan?</Text>
        </View>
        <LinkRow label="Buka Tentang Awanin" href="/tentang" />
        <LinkRow label="Baca kebijakan privasi" href="/privasi" />
      </InfoSection>
    </InfoScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    footer: {
      paddingBottom: 4,
    },
    footerText: {
      ...typo.body,
      color: colors.mutedText,
    },
  };
}
