# Changelog

Riwayat rilis aplikasi Android Awanin. Versi mengikuti `expo.version` dan tanggal
mengikuti publikasi GitHub Release. Tiga rilis terakhir (1.3.2–1.3.4) semuanya
bertema pengingat pagi: 1.3.2 memasang fiturnya, 1.3.3 membuatnya tepat waktu,
1.3.4 membuatnya jujur dan terbaca pembaca layar.

## [1.3.4] — 9 November 2026

### Diperbaiki
- **Toggle pengingat tidak lagi berbohong.** Saat izin notifikasi ditolak, baris
  "Pengingat pagi" dulu tetap menyala dan berjanji "Terjadwal 06.00" padahal tidak
  ada satu pun notifikasi yang dijadwalkan. Sekarang toggle kembali mati dengan
  penjelasan di bawahnya.
- **Chip jam terbaca TalkBack.** Chip 05.00–09.00 memakai `accessibilityState.checked`
  (sebelumnya hanya `selected`, yang tidak dibacakan pada `role="radio"`).

### Ditambahkan
- Baris bantuan "Alarm & pengingat" muncul di layar Notifikasi bila Android 14+
  belum memberi izin alarm tepat waktu; menekannya membuka setelan sistem, dan
  barisnya hilang sendiri setelah izin diberikan.

## [1.3.3] — 9 November 2026

### Diubah
- Pengingat pagi memakai `delivery: 'alarmClock'` sehingga Android menjadwalkannya
  lewat `setAlarmClock()`.
- `app.json` mendeklarasikan `android.permission.SCHEDULE_EXACT_ALARM`.

### Alasan
Tanpa izin itu `expo-notifications` jatuh ke `setAndAllowWhileIdle` (inexact),
sehingga pengingat bisa telat beberapa menit saat Doze atau kebijakan hemat baterai
OEM. Alarm `setAlarmClock` tidak digeser sistem. `USE_EXACT_ALARM` sengaja tidak
dipakai karena izin itu hanya untuk aplikasi alarm/jam menurut kebijakan Play.

### Catatan
`versionCode` masih 3: `eas.json` memakai `appVersionSource: "remote"` dan hanya
profil `production` yang menyalakan `autoIncrement`, jadi `versionCode` di
`app.json` diabaikan untuk build `preview`. Sideload tetap aman (keystore sama),
tapi Play Store butuh angka yang naik.

## [1.3.2] — 9 November 2026

### Ditambahkan
- **Pengingat pagi terjadwal dari prakiraan AQI.** Pilih jam 05.00–09.00; antrean
  tiga hari ke depan dengan identifier `awanin-morning-<tanggal>` di channel
  `air-quality`. Zona waktu mengikuti lokasi (WIB/WITA/WIT dihitung lewat `Intl`,
  bukan offset tetap). Tanpa server, tanpa Firebase, tanpa akun.
- Sinkronisasi otomatis setiap bacaan AQI, dengan *signature* tersimpan supaya
  pull-to-refresh tidak membatalkan dan menjadwalkan ulang antrean terus-menerus.
  Prakiraan kosong atau offline tidak menghapus antrean yang masih berlaku.

### Diubah
- "Update Cuaca" menjadi **"Ringkasan harian"**, dan baris Profil "Server & push"
  menjadi **"Pengingat & jenis"**, agar label sesuai perilaku aplikasi.
- Ringkasan harian otomatis nonaktif saat pengingat pagi menyala, supaya satu hari
  tidak menerima dua notifikasi berisi informasi yang sama.

### Alasan
Feed notifikasi yang ada hanya berbicara saat aplikasi dibaca, jadi tidak bisa
membangunkan pengguna. Pengingat pagi memberi satu dorongan yang tetap masuk
walau aplikasi ditutup, tanpa perlu infrastruktur push.

## [1.3.1] — 6 November 2026

### Ditambahkan
- Notifikasi kualitas udara tampil sebagai notifikasi Android: ringkasan harian,
  perubahan kategori AQI, dan tips kesehatan — dijalankan dari perangkat sendiri.

### Diubah
- Pesan push jarak jauh yang menampilkan error Firebase mentah diganti kalimat
  netral. Push jarak jauh dimatikan (`remotePushEnabled = false`) sampai
  `google-services.json` dan kredensial FCM tersedia; notifikasi lokal tetap jalan.

### Alasan
Menghapus ketergantungan Firebase/server untuk sementara tanpa menghilangkan
notifikasi yang berguna bagi pengguna.
