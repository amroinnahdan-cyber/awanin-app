# Dokumen Pengumpulan — Project Assignment: Mobile App UI Design

## Awanin — Aplikasi Pemantau Kualitas Udara Jakarta

---

| | |
|---|---|
| **Nama Aplikasi** | **Awanin** |
| **Slogan** | **Know Your Air** |
| **Platform Desain** | Figma — [Awanin Mobile App](https://www.figma.com/design/qg87nqVQubJ418Rjw5zN1g/Awanin-Mobile-App?node-id=3-2&t=Q2Fx7mM0TOiwOFp5-1) |
| **Jumlah Screen** | 8 screen (melebihi syarat minimal 3) |
| **Sumber Data** | Open-Meteo Air Quality API & Weather API (public API, tanpa API key) |
| **Kelompok** | _[isi nama kelompok]_ |
| **Anggota** | _[isi nama anggota 1, 2, 3, …]_ |
| **Mentor** | _[isi nama mentor]_ |

---

## 1. Deskripsi Masalah

Kualitas udara di Jakarta termasuk yang terburuk di Indonesia. Polusi udara
(misalnya PM2.5, PM10, dan ozon) memengaruhi kesehatan warga — terutama mereka yang
beraktivitas di luar ruangan, berolahraga, atau memiliki kondisi pernapasan seperti
asma.

Masalahnya: **informasi kualitas udara yang akurat dan mudah dipahami sulit diakses
oleh masyarakat umum.** Data pemerintah sering berupa angka teknis (µg/m³) yang sulit
ditafsirkan, tersebar di banyak sumber, dan tidak memberi tahu apa artinya bagi
aktivitas sehari-hari — misalnya: *bolehkah lari pagi hari ini? Haruskah memakai masker?
Kapan waktu terbaik untuk berjemur?*

Akibatnya, warga mengambil keputusan harian (berangkat kerja, olahraga, mengajak anak
bermain) **tanpa tahu kondisi udara yang mereka hirup**.

## 2. Target Pengguna & Solusi yang Ditawarkan

### Target Pengguna

1. **Warga Jakarta (17–45 tahun)** yang beraktivitas harian di luar ruangan — pekerja,
   pelajar, komuter.
2. **Warga yang peduli kesehatan** — penderita asma/alergi, orang tua dengan anak kecil,
   lansia dan keluarganya.
3. **Warga yang berolahraga outdoor** — pelari, pesepeda, komunitas olahraga taman/kota.

### Solusi yang Ditawarkan

**Awanin** adalah aplikasi mobile yang menampilkan kualitas udara Jakarta Pusat secara
*real-time* dalam bentuk yang langsung bisa dipahami:

- **Indeks AQI dalam ring visual** dengan kategori berwarna (Baik → Berbahaya) dan
  angka yang mudah dibaca, bukan sekadar angka teknis.
- **Rekomendasi aktivitas** yang menjawab pertanyaan harian pengguna (bolehkah olahraga
  di luar? perlu masker atau tidak?).
- **Peta sebaran kualitas udara** antar-kawasan (Monas, Bundaran HI, GBK, Kota Tua)
  agar pengguna bisa memilih lokasi terbaik untuk beraktivitas.
- **Riwayat 7–30 hari** untuk melihat pola dan memilih hari terbaik untuk aktivitas
  outdoor.
- **Notifikasi perubahan kategori AQI** agar pengguna selalu tahu ketika kondisi udara
  berubah.
- **Tips kesehatan** terkait polusi udara (masker, olahraga, pola makan, sirkulasi udara).

## 3. Nama Aplikasi & Fitur Utama

**Awanin** — diambil dari kata "awan", menggambarkan langit dan udara yang dipantau
aplikasi ini, dengan slogan **"Know Your Air"** — kenali udara yang kamu hirup sebelum
memutuskan aktivitas. Logo aplikasi berbentuk glyph awan dengan wordmark "Awanin"
berwarna biru brand `#1854c8`.

### Fitur Utama

| # | Fitur | Penjelasan |
|---|---|---|
| 1 | **Dashboard Kualitas Udara** | Ring AQI besar dengan kategori berwarna, nilai PM2.5/PM10/NO₂/O₃, info cuaca (suhu, kelembapan, angin), dan rekomendasi aktivitas harian. |
| 2 | **Peta Kualitas Udara** | Peta Jakarta Pusat dengan marker tiap kawasan (Monas, Bundaran HI, GBK, Kota Tua) dan nilai AQI-nya, plus pratinjau lokasi. |
| 3 | **Detail Lokasi** | Halaman per lokasi: AQI lokal, grafik kecil, tombol "Lihat di peta". |
| 4 | **Riwayat Kualitas Udara** | Grafik tren AQI 7/30 hari dengan nilai rata-rata, tertinggi, terendah per hari. |
| 5 | **Notifikasi** | Pengaturan notifikasi: peringatan AQI tinggi, tips kesehatan, update cuaca, lokasi notifikasi — plus feed kejadian nyata saat kategori AQI berubah. |
| 6 | **Tips Kesehatan** | Maskot awan + tips praktis: masker, kurangi aktivitas berat, minum air putih, tanaman penyaring udara. |
| 7 | **Profil & Pengaturan** | Profil pengguna, pengaturan notifikasi, lokasi favorit, privasi, bantuan, tentang aplikasi. |
| 8 | **Splash Screen** | Layar pembuka dengan logo Awanin, latar `#d9eeff`, transisi halus 300ms. |

### Alur Penggunaan Singkat

> Buka aplikasi → Splash → **Beranda** (lihat AQI hari ini + rekomendasi) →
> cek **Peta** untuk bandingkan kawasan → buka **Detail Lokasi** tujuan →
> lihat **Riwayat** untuk pilih hari terbaik → aktifkan **Notifikasi** supaya
> tidak ketinggalan perubahan kondisi udara.

## 4. Screen UI di Figma (8 Screen)

Seluruh screen berada di canvas **Hi-Fi** file Figma Awanin Mobile App.

| # | Screen | Isi Utama | Node Figma |
|---|---|---|---|
| 1 | Splash Screen | Ilustrasi langit & skyline Jakarta, logo Awanin, slogan "Know Your Air" | `2027:8125` |
| 2 | Beranda / Air Quality Dashboard | Ring AQI, kategori, polutan, cuaca, rekomendasi aktivitas, tips singkat, lokasi populer | `2027:8143` |
| 3 | Peta Kualitas Udara | Peta Jakarta Pusat + marker kawasan + pratinjau lokasi | `2027:8233` |
| 4 | Riwayat Kualitas Udara | Grafik tren AQI 7/30 hari, statistik harian | `2027:8376` |
| 5 | Profil | Profil pengguna + menu Pengaturan (Notifikasi, Lokasi favorit, Unit & format, Privasi, Bantuan, Tentang) | `2027:8531` |
| 6 | Notifikasi | Pengaturan notifikasi (peringatan AQI, tips, cuaca) + feed kejadian | `2027:8607` |
| 7 | Tips Kesehatan | Kumpulan tips menghadapi polusi udara | `2027:8473` |
| 8 | Detail Lokasi | Foto lokasi, ring AQI + 5 polutan, rekomendasi, cuaca, tombol "Lihat Rute" (Monas, Bundaran HI, GBK, Kota Tua) | `2027:8300` |

### Konsistensi Desain (Layout, Warna, Tipografi, Komponen)

- **Layout**: grid & spacing konsisten (padding 16px standar, bottom nav dengan
  geometri tetap: 12 top + 41 item + 18 gap + 4 home indicator + 7 bottom = 82px).
- **Warna**: palet biru langit — aksen utama `#1854c8`, latar `#d9eeff`, kartu
  `#f5f9ff`, teks gelap navy. Warna kategori AQI mengikuti standar skala AQI
  (hijau → kuning → oranye → merah → ungu).
- **Tipografi**: satu keluarga sans-serif, hierarki jelas (judul besar, label kecil
  bold, body reguler).
- **Komponen**: kartu, ring AQI, badge kategori, bottom nav, tombol, dan baris menu
  dipakai berulang konsisten di semua screen.

## 5. Prototype & Navigasi Antar-Screen

Prototype di Figma menghubungkan screen-screen berikut sehingga alur aplikasi bisa
dicoba langsung:

| Dari | Aksi | Ke |
|---|---|---|
| Splash Screen | Otomatis / tap | Beranda |
| Beranda | Tap ikon lonceng | Notifikasi |
| Beranda | Tap kartu "Tips singkat" | Tips Kesehatan |
| Beranda / Peta | Tap kartu Lokasi Populer / pratinjau Monas | Detail Lokasi |
| Detail Lokasi | Tap tombol "Lihat di peta" | Peta Kualitas Udara |
| Bottom nav | Tap tab (Beranda / Peta / Riwayat / Profil) | Screen utama terkait |
| Notifikasi, Tips, Detail | Tombol kembali | Layar sebelumnya / Beranda |

Setiap anggota kelompok memahami alur desain dan dapat mendemonstrasikan prototype
saat presentasi.

## 6. Link File Figma

**[Awanin Mobile App — Figma](https://www.figma.com/design/qg87nqVQubJ418Rjw5zN1g/Awanin-Mobile-App?node-id=3-2&t=Q2Fx7mM0TOiwOFp5-1)**

> Pastikan file disetel **"Anyone with the link can view"** agar mentor dapat
> membukanya. (Cek: Share → Anyone with the link → can view.)

## 7. Sumber Data — Public API

**Open-Meteo** — https://open-meteo.com — public API gratis, **tanpa API key dan tanpa
registrasi**. Lisensi non-komersial dengan kewajiban atribusi:
*"Air quality and weather data by Open-Meteo"*.

| Data yang Digunakan | Endpoint | Contoh Parameter |
|---|---|---|
| Kualitas udara saat ini | `air-quality-api.open-meteo.com/v1/air-quality` | `us_aqi`, `pm2_5`, `pm10`, `nitrogen_dioxide`, `ozone`, `carbon_monoxide`, `sulphur_dioxide` |
| Cuaca | `api.open-meteo.com/v1/forecast` | `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m` |
| Riwayat AQI | air-quality API | `hourly=us_aqi`, `past_days=7` / `past_days=30` (diagregasi jadi rata-rata/maks/min harian) |

Lokasi yang dipantau: **Jakarta Pusat** (lat -6.1754, lon 106.8272, timezone
`Asia/Jakarta`) dan kawasan sekitarnya: Monas, Bundaran HI, GBK, Kota Tua.

Catatan teknis: data Open-Meteo untuk Indonesia berasal dari model global CAMS
(resolusi ~45 km, update per 3 jam) — cukup untuk gambaran umum kualitas udara
kawasan. Untuk kebutuhan desain, mock data juga diperbolehkan sesuai ketentuan tugas.

## 8. (Bonus) Implementasi Lanjutan — React Native + Expo

Sesuai ketentuan tugas, implementasi kode memang **belum diwajibkan**. Namun sebagai
pengembangan lanjutan, desain Awanin sudah diimplementasikan menjadi aplikasi mobile
nyata menggunakan **React Native + Expo (Expo Router)** dengan 8 layar yang seluruhnya
mengikuti desain Figma, plus integrasi ke Open-Meteo API (data real, bukan mock) melalui
**backend sendiri**. Kode aplikasi dan backend tersedia pada repositori ini
(`awanin-app/` dan `awanin-app/server/`).

### 8.1 Arsitektur

```
Aplikasi Expo  ──JSON/HTTPS──▶  awanin-server (Express + SQLite)
    │                                │
    │ fallback langsung              │  cache 10 menit + scheduler 15 menit
    ▼                                ▼
Open-Meteo Air Quality & Weather API (tanpa API key)
```

- **Aplikasi** — 8 layar, navigasi Expo Router, tema & komponen konsisten dengan
  Figma. Sumber data dipilih berurutan: backend → Open-Meteo langsung → cache
  perangkat (ditandai *stale*), sehingga aplikasi tetap berguna saat offline.
- **Backend** (`server/`) — Node 22 + Express 4 + SQLite bawaan (`node:sqlite`).
  Mem-proxy dan meng-cache Open-Meteo (snapshot 10 menit, riwayat 15 menit),
  menyimpan riwayat pembacaan per lokasi, dan mengirim push notification Expo saat
  kategori AQI berubah. Validasi zod, helmet, CORS allow-list, rate limit, serta
  dokumentasi OpenAPI di `/docs` dan `/openapi.json`.
- **Push** — perangkat mendaftarkan `deviceId` anonim + token Expo. Scheduler
  memeriksa ambang AQI, jam tenang (22:00–06:00 WIB), cooldown 180 menit, dan hanya
  mengirim saat kategori berubah — bukan setiap polling.
- **Database** — tabel `devices`, `preferences`, `notifications`, `readings`,
  `api_cache`; skema dibuat idempoten saat boot, tanpa migration tool terpisah.

### 8.2 Menjalankan

```bash
# Backend
cd server && npm install && npm run dev     # http://localhost:4000/docs

# Aplikasi (terminal lain)
cd awanin-app && npm install
cp .env.example .env    # EXPO_PUBLIC_API_URL=http://localhost:4000
npx expo start          # tekan w / a / i, atau scan dengan Expo Go
```

Pemeriksaan: `npm run lint`, `npm run typecheck`, `npm test` (aplikasi) dan
`npm run typecheck`, `npm test` (backend). CI menjalankan semuanya pada setiap push.

### 8.3 Yang bisa didemokan

1. Beranda menampilkan AQI nyata + prakiraan lima hari dan cuaca dari backend.
2. Peta membandingkan Monas, Bundaran HI, GBK, dan Kota Tua; ketuk marker → Detail.
3. Riwayat 7/30 hari dengan grafik dan statistik dari tabel `readings`.
4. Notifikasi: ubah preferensi, kirim push uji (di development build), lihat riwayat.
5. Matikan backend → aplikasi otomatis memakai Open-Meteo langsung, lalu cache
   perangkat; UI menandai data tersimpan alih-alih menampilkan error.

---

## Ringkasan untuk Presentasi

1. **Masalah**: informasi kualitas udara Jakarta sulit diakses & sulit dipahami
   masyarakat untuk keputusan harian.
2. **Solusi**: Awanin — *Know Your Air*: AQI real-time yang visual, dengan rekomendasi
   aktivitas, peta antar-kawasan, riwayat, notifikasi, dan tips kesehatan.
3. **Desain**: 8 screen konsisten di Figma (melebihi minimal 3), prototype terhubung,
   bisa dicoba lewat link Figma di atas.
4. **Data**: Open-Meteo public API (tanpa API key) — sudah terbukti berfungsi.
5. **Pemahaman**: seluruh anggota kelompok siap menjelaskan setiap screen dan alurnya.
