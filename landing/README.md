# Awanin — Landing Page

Website publik produk (*Fase Sell: Landing Page*) untuk aplikasi Awanin —
*Know Your Air*, versi 1.3.3.

## Isi

Satu berkas statis [`index.html`](index.html) dengan CSS di dalamnya — tanpa
framework dan tanpa build step. Satu-satunya permintaan eksternal adalah font
Inter dari Google Fonts, dengan fallback font sistem bila offline. Aset
(`logo-mark`, lima tangkapan layar aplikasi, favicon) berada di
[`assets/`](assets).

Bagian halaman: hero, statistik, masalah & solusi, 10 fitur, galeri 5 layar,
data & transparansi (Open-Meteo, dua skala indeks, batasan CAMS, cache
backend), kuis edukasi, bagian "Yang baru" (pengingat pagi terjadwal), dan bagian unduhan (APK + Expo Go).

## Tangkapan layar

Lima PNG di `assets/` adalah tangkapan layar **aplikasi versi 1.3.0**, bukan
mockup Figma: diambil dari build web React Native yang sama pada viewport
390×844 @2× (tema terang, data Jakarta Pusat), lalu dipakai apa adanya.

| Berkas | Layar |
| --- | --- |
| `screen-beranda.png` | Beranda — ring AQI, polutan, prakiraan 5 hari, waktu terbaik olahraga |
| `screen-sekitar.png` | Sekitar — posisi perangkat, AQI, jarak ke tiap titik |
| `screen-riwayat.png` | Riwayat — tren 7 hari, rentang kustom, detail polutan |
| `screen-indonesia.png` | Indonesia — rata-rata nasional, terbersih/terburuk, peringkat |
| `screen-peta.png` | Peta — 100 kota di OpenStreetMap, mode AQI atau PM2.5 |

Bila UI berubah, ambil ulang kelima layar di 390×844 (tema terang) dan timpa
berkas dengan nama yang sama — halaman tidak perlu diubah.

## Menjalankan

Cukup buka `index.html` di browser, atau sajikan foldernya:

```bash
cd landing
python -m http.server 8123   # lalu buka http://127.0.0.1:8123
```

## Deploy ke Vercel

Folder ini statis, jadi tidak ada perintah build. Ada dua cara:

1. **Dashboard** — impor repo, lalu set *Root Directory* ke `awanin-app/landing`,
   *Framework Preset* ke **Other**, dan biarkan *Build Command* serta
   *Output Directory* kosong.
2. **CLI** — dari dalam folder ini:

   ```bash
   npx vercel        # preview
   npx vercel --prod # produksi
   ```

[`vercel.json`](vercel.json) menyalakan `cleanUrls`, mematikan trailing slash,
dan memberi header cache satu tahun untuk `/assets/*` (nama berkas layar
sengaja tidak ber-hash, jadi bila mengganti gambar pertimbangkan mengganti
namanya juga).

Hosting statis lain juga bisa: GitHub Pages, Netlify, atau Cloudflare Pages
dengan *publish directory* `landing/`.

Tautan unduhan APK menunjuk ke aset GitHub Release
(`github.com/amroinnahdan-cyber/awanin-app/releases/download/v1.3.3/awanin-1.3.3.apk`),
bukan artefak EAS yang punya masa berlaku unduhan.
### Checklist rilis APK baru

1. Buat release `v<versi>` dengan aset `awanin-<versi>.apk`.
2. `index.html`: perbarui label versi di hero, eyebrow `#baru`, dan kartu
   `#unduh`, plus URL aset di tombol unduh.
3. Sesuaikan isi tiga kartu `#baru` bila cakupan rilis berubah.
4. Perbarui baris versi di README ini.
5. Deploy: `npx vercel --prod`; GitHub Pages ikut ter-deploy dari `master`.

## Catatan

- Palet dan radius mengikuti `src/theme/tokens.ts`: latar `#f5f9ff`, teks navy
  `#153c70`, aksen `#1854c8`, kategori Baik `#4abc78` / Sedang `#f5bb42` /
  Sensitif `#f0863c` / Tidak Sehat `#ef6b56`.
- Hero memakai gradien `heroSky → heroBottom` dan glow yang sama dengan kartu
  hero di aplikasi; tidak ada foto stok atau ilustrasi lama.
- `og:image`, `og:url`, `twitter:image`, dan `canonical` memakai domain absolut
  `https://awanin-landing.vercel.app/` — crawler WhatsApp/Instagram/X tidak bisa
  membaca path relatif. Ubah bila domain utama berganti.
- `og:image` masih memakai tangkapan layar potret 390×844; untuk kartu 1.91:1
  yang lebih rapi, ganti dengan gambar 1200×630 di `assets/`.
- Atribusi Open-Meteo, OpenStreetMap, dan GeoNames wajib dipertahankan (syarat
  lisensi).
