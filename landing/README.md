# Awanin — Landing Page

Website publik produk (deliverable Fase Sell: *Landing Page*) untuk aplikasi
Awanin — *Know Your Air*.

## Isi

Satu berkas statis [`index.html`](index.html) dengan CSS di dalamnya — tanpa
framework, tanpa build step, tanpa dependensi eksternal (hanya font sistem).
Aset (`logo-mark`, tangkapan layar Figma, ilustrasi splash, favicon) berada di
[`assets/`](assets).

Bagian halaman: hero *Know Your Air*, masalah & solusi, 8 fitur utama, galeri 5
layar dari ekspor Figma, bagian data & transparansi (Open-Meteo, batasan CAMS,
GeoNames, cache backend), dan bagian unduhan (status APK + menjalankan lewat
Expo Go).

## Menjalankan

Cukup buka `index.html` di browser, atau sajikan foldernya:

```bash
cd landing
python -m http.server 8123   # lalu buka http://127.0.0.1:8123
```

## Deploy

Halaman ini file statis, jadi bisa dipakai di mana saja:

- **GitHub Pages** — salin isi folder ini ke branch `gh-pages`, atau pakai
  GitHub Action `actions/upload-pages-artifact` dengan `path: landing`.
- **Netlify / Vercel / Cloudflare Pages** — arahkan *publish directory* ke
  `landing/` tanpa perintah build.
- **Opsi termudah** — drag-and-drop foldernya di [Netlify Drop](https://app.netlify.com/drop).

Tautan unduhan APK di bagian *Coba Awanin* menunjuk ke halaman rilis GitHub
(`…/releases`); ganti dengan URL unduhan langsung begitu APK produksi tersedia.

## Catatan

- Palet warna mengikuti token aplikasi (`src/theme/tokens.ts`): aksen `#1854c8`,
  latar `#f5f9ff`, teks navy `#153c70`.
- Tangkapan layar berasal dari ekspor Figma (canvas Hi-Fi), bukan screenshot
  perangkat — ganti dengan screenshot nyata setelah APK rilis bila diinginkan.
- Atribusi Open-Meteo dan GeoNames wajib dipertahankan (syarat lisensi).
