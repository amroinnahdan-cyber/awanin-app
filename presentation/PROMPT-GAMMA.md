# Prompt Gamma AI — Presentasi Awanin

Tempel isi blok pertama ke kotak **Generate / Paste in text** di [gamma.app](https://gamma.app).
Semua angka di prompt ini sudah sesuai kondisi repo (versi 1.3.4), jadi Gamma tidak perlu mengarang.

---

## 1. Prompt utama (salin semua)

```
Buat presentasi 12 kartu dalam Bahasa Indonesia untuk mata kuliah Mobile App UI Design.

KONTEKS
Awanin ("Know Your Air") adalah aplikasi Android pemantau kualitas udara Jakarta yang
mengubah data Open-Meteo menjadi keputusan harian. Audiens: dosen dan teman kelas.
Durasi 8 menit. Nada: profesional, ringkas, tanpa bahasa berbunga.

GAYA VISUAL
Latar abu-biru lembut #ccd7e3, kartu putih membulat radius 24px, aksen biru #1854c8,
beberapa kartu biru penuh dan navy #12233c untuk penekanan. Label kecil berupa pill
huruf kapital. Tipografi sans-serif tebal dengan jarak huruf rapat. Banyak ruang kosong,
garis rambut tipis. Hindari gradien ramai, bayangan berlebihan, dan emoji.

STRUKTUR 12 KARTU
1. Judul: "Awanin — Know Your Air". Subjudul: aplikasi pemantau kualitas udara Jakarta.
   Chip kecil: 8 screen Figma · 14 layar · Expo 58 · Versi 1.3.4.
2. Masalah: data kualitas udara ada, tetapi tidak menjawab pertanyaan warga — angka
   teknis µg/m³, tersebar di banyak sumber, tanpa konteks waktu.
3. Target pengguna: warga dan komuter, kelompok sensitif (asma, anak kecil, lansia),
   serta pelari dan pesepeda.
4. Solusi: ring AQI berwarna dengan rekomendasi aktivitas, jendela waktu terbaik
   olahraga dua jam, peringkat 100 kota di 38 provinsi, riwayat 7/30 hari, dan
   pengingat pagi yang dijadwalkan Android.
5. Desain: 8 screen Figma dan 14 layar terimplementasi; palet #1854c8, font Inter,
   grid padding 16px, kontras teks memenuhi WCAG AA.
6. Arsitektur: aplikasi Expo ke backend Express + SQLite ke Open-Meteo, dengan tiga
   lapis fallback — backend, Open-Meteo langsung, lalu cache perangkat.
7. Alur penggunaan: buka aplikasi, beranda, waktu terbaik, peringkat nasional,
   detail dan riwayat, lalu notifikasi.
8. Keputusan teknis: gauge AQI piecewise agar AQI 40-90 tetap terlihat, ISPU dihitung
   di perangkat sesuai Permen LHK 14/2020, pengingat pagi memakai zona WIB/WITA/WIT
   lewat Intl, serta ticket per request dan cache TTL 5/15 menit untuk mencegah
   HTTP 429.
9. Backend: endpoint /v1/air, /v1/air/:slug/history, /v1/devices; cache bersama
   10 menit; scheduler 15 menit yang hanya mengirim saat kategori berubah, dengan
   jam tenang 22.00-06.00 WIB dan cooldown 180 menit.
10. Kualitas: 150 test otomatis (127 aplikasi + 23 backend), lint dan typecheck
    bersih, CI berjalan di setiap push.
11. Rilis: EAS Build ke GitHub Release v1.3.4, landing page di Vercel dan GitHub Pages;
    riwayat 1.3.2 pengingat pagi, 1.3.3 alarm tepat waktu, 1.3.4 perbaikan izin
    dan aksesibilitas.
12. Penutup: "Data yang bisa dipakai, bukan cuma dilihat." Sebut keterbatasan
    (data model global CAMS sekitar 45 km, pengingat berupa snapshot tiga hari)
    dan rencana lanjutan (sensor lokal, akun opsional, Play Store).

ATURAN ISI
Maksimal 35 kata per kartu, maksimal 5 butir per kartu. Gunakan hanya angka yang
diberikan; jangan menambah statistik, kutipan, atau nama orang lain. Hindari bullet
bertingkat. Satu kartu (nomor 6) berisi diagram sederhana untuk arsitektur.

BAHASA
Indonesia formal-santai. Kalimat pernyataan pendek. Jangan memakai sapaan "kamu"
di dalam kartu.

Hasilkan tepat 12 kartu dengan urutan di atas.
```

## 2. Versi pendek (kalau kotaknya membatasi panjang)

```
Buat 12 kartu presentasi Bahasa Indonesia tentang Awanin, aplikasi Android pemantau
kualitas udara Jakarta (Expo + Node). Audiens dosen, durasi 8 menit. Urutan: judul,
masalah, target pengguna, solusi, desain, arsitektur (aplikasi - backend - Open-Meteo,
tiga lapis fallback), alur pemakaian, keputusan teknis, backend, kualitas (150 test),
rilis (v1.3.4), penutup. Gaya: latar #ccd7e3, kartu putih radius 24, aksen biru #1854c8,
kartu navy #12233c, label pill kapital, tipografi tebal rapat, tanpa emoji.
Maksimal 35 kata per kartu, jangan mengarang angka.
```

## 3. Prompt perbaikan tampilan (kalau hasil pertama terlalu ramai)

```
Rapikan deck ini dengan gaya editorial minimal: latar abu-biru #ccd7e3, kartu putih
radius 24px, aksen biru #1854c8, satu kartu navy #12233c per bagian, label pill
huruf kapital 10px, judul sans-serif 800 dengan letter-spacing rapat, garis rambut
1px, tanpa emoji dan tanpa ilustrasi kartun. Kurangi teks tiap kartu menjadi
maksimal 25 kata.
```

## 4. Prompt perbaikan satu kartu

```
Perbaiki kartu 6 (arsitektur): buat diagram tiga kotak berurutan Aplikasi, Backend,
Open-Meteo dengan panah bolak-balik, tambahkan satu kurva putus-putus berlabel
"fallback langsung" dari Aplikasi ke Open-Meteo. Teks pendukung maksimal 12 kata
per kotak.
```

---

## Catatan pemakaian

- Di Gamma pilih **Create → Paste in text**, tempel prompt, lalu set jumlah kartu **12**.
- Bahasa deck: **Indonesian**. Tema: **Custom** dengan warna `#1854c8` (aksen), `#ccd7e3`
  atau `#e9eff6` (latar), `#12233c` (teks/kartu gelap).
- Setelah jadi, ekspor **PPTX** atau **PDF** lewat menu Share/Export, atau presentasikan
  langsung dari tautan Gamma.
- Deck HTML yang sudah jadi (tanpa perlu Gamma) ada di `presentation/index.html`.
