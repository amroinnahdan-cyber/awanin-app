# Awanin — mobile app (Expo / React Native)

Aplikasi kualitas udara untuk Jakarta Pusat, dibangun dari file Figma
**Awanin Mobile App** (canvas `Hi-Fi`, node `3:2`).

## Menjalankan

```bash
cd awanin-app
npm install          # atau: npx expo install
npx expo start       # tekan w / a / i, atau pakai Expo Go
```

Pemeriksaan:

```bash
npx tsc --noEmit     # typecheck
npx eslint .         # lint
```

> `npx expo lint` gagal di mesin ini (ESLint 9 terpasang tapi CLI menolak versinya),
> jadi lint dijalankan lewat `npx eslint .` langsung.

## Delapan layar (seluruh canvas Hi-Fi)

| Rute | Layar | Node Figma |
|---|---|---|
| — (overlay saat launch) | Splash Screen | `2027:8125` |
| `/` | Beranda / Air Quality Dashboard | `2027:8143` |
| `/peta` | Peta Kualitas Udara | `2027:8233` |
| `/riwayat` | Riwayat Kualitas Udara | `2027:8376` |
| `/profil` | Profil | `2027:8531` |
| `/notifikasi` | Notifikasi | `2027:8607` |
| `/tips` | Tips Kesehatan | `2027:8473` |
| `/lokasi/[slug]` | Detail Lokasi (Monas, Sudirman, Menteng, Kota Tua) | `2027:8300` |

Navigasi memakai Expo Router (`src/app/`) dengan bottom nav kustom yang mengikuti
geometri Figma: 12 top + 41 item + 18 gap + 4 home indicator + 7 bottom = 82.

Alur yang sudah tersambung: bell di Beranda → Notifikasi, kartu "Tips singkat" → Tips
Kesehatan, kartu Lokasi Populer → Detail Lokasi, kartu pratinjau Monas di Peta → Detail
Monas, dan tombol "Lihat di peta" di Detail → Peta.

Splash mengikuti prototype Figma: latar `#d9eeff`, transisi 300ms ease-out, dan bisa
diketuk untuk langsung masuk. Isinya memakai logo asli Awanin, bukan lagi ikon pengganti.

## Logo & ikon aplikasi

Logo sumber (biru datar di atas `#f8f7f5`) diolah oleh
[`tools/process-logo.py`](tools/process-logo.py) — tanpa dependensi, karena lingkungan ini
tidak punya Pillow/ImageMagick; skripnya memuat dekoder/encoder PNG sendiri.

Skrip memisahkan artwork menjadi dua pita scanline (glyph awan dan wordmark), lalu
menghasilkan:

| Aset | Ukuran | Dipakai untuk |
|---|---|---|
| `assets/logo-source.png` | 1254² | arsip asli |
| `assets/logo-lockup.png` | 720×542 | splash (glyph + wordmark) |
| `assets/logo-mark.png` | 512² | glyph transparan |
| `assets/icon.png` | 1024² | ikon iOS/macOS |
| `assets/favicon.png` | 64² | favicon web |
| `assets/android-icon-foreground.png` | 1024² | ikon adaptif Android (safe zone 26%) |
| `assets/android-icon-background.png` | 1024² | latar adaptif `#f5f9ff` |
| `assets/android-icon-monochrome.png` | 1024² | ikon bertema Android |

Warna brand yang tersampel dari file: **`#245dc5`**. Perhatikan bahwa aksen UI dari
Figma adalah **`#1854c8`** — dua biru yang berdekatan tapi tidak identik, jadi masih
perlu keputusan mana yang jadi acuan sebelum rilis.

Tombol kembali memakai `useBackOrHome()` (`src/lib/navigation.ts`). Ini bukan sekadar
`router.back()`: sub-layar bisa dibuka langsung lewat URL, dan pada kasus itu
`router.canGoBack()` melaporkan `true` padahal `router.back()` tidak melakukan apa pun
(tombol terasa mati) — sementara tanpa riwayat sama sekali ia melempar
"The action 'GO_BACK' was not handled". Handler ini membaca `navigation.getState()`:
indeks 0 berarti tidak ada layar sebelumnya, jadi ia `replace` ke parent yang pasti
(`/` untuk Notifikasi & Tips, `/peta` untuk Detail Lokasi).

## Sumber data

**Open-Meteo** — https://open-meteo.com — tanpa API key, tanpa registrasi.

- Kualitas udara: `air-quality-api.open-meteo.com/v1/air-quality`
  (`us_aqi`, `pm2_5`, `pm10`, `nitrogen_dioxide`, `ozone`, …)
- Cuaca: `api.open-meteo.com/v1/forecast` (`temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`)
- Riwayat: `hourly=us_aqi&past_days=7|30`, diagregasi menjadi rata-rata/maks/min harian

Data Open-Meteo untuk Jakarta berasal dari model global CAMS (~45 km, 3-jaman),
bukan stasiun pengukuran setempat. Lisensi non-komersial, atribusi wajib.

## Penyimpangan yang disengaja dari Figma

1. **Warna teks sekunder.** `#8192ab` hanya mencapai 3,17:1 di atas putih (2,97:1 di atas
   `#f5f9ff`) sehingga gagal WCAG AA untuk teks kecil. Token `color.mutedText`
   (`#596b86`, 5,4:1) dipakai untuk teks < 18px; `#8192ab` tetap untuk ikon.
2. **Label kategori AQI pindah ke bawah ring, bukan di dalamnya.** Ini keluhan
   “desain tidak rapi”: di dalam ring, badge bertabrakan dengan busur — pada tinggi
   badge, lebar dalam lingkaran hanya ~124px sementara "Tidak Sehat untuk Sensitif"
   butuh ~154px, sehingga badge menutup stroke busur dan ujung busur menyembul di
   bawahnya. Sekarang badge duduk di bawah ring (jarak bebas 24px ke tepi dalam
   stroke) dan selalu satu baris. File Figma sendiri memiliki tabrakan ini; penyimpangan
   ini sengaja.
3. **Ring tetap 174px** — sempat saya ubah ke 182px berdasarkan screenshot ber-zoom,
   lalu dikembalikan setelah diukur ulang dari export 1:1 (`beranda.png`): radius luar
   busur 86,9px, jadi 174px. Semua temuan ukuran lain dari screenshot itu juga
   dinyatakan batal.
4. **Label badge 12 bold dengan padding 10px**, bukan 13 bold / 12px: dengan begitu
   badge terlebar (154px teks + 20px padding = 174px) tidak pernah melebihi lebar ring
   yang dilabelinya, dan label tetap satu baris.
5. **Warna teks label kategori dihitung, bukan selalu putih.** Putih di atas kuning
   `#f5bb42` hanya 1,74:1 (praktis tak terbaca). `readableOn()` di `src/lib/aqi.ts`
   memilih mana yang lebih kontras: putih di atas ungu/merah, `#153c70` di atas
   hijau/kuning/oranye. Sisa keterbatasan: pada `#f0863c` dan `#ef6b56` pilihan
   terbaik hanya 4,28:1 dan 3,61:1 — perlu keputusan desain (warna palet) untuk
   mencapai 4,5:1.
6. **`color.muted` tidak lagi dipakai untuk teks kecil di dalam ring** (label "AQI"
   11px): diganti `mutedText` karena `#8192ab` hanya ~3:1 di atas gradien hero.
7. **Ritme vertikal hero ditata ulang** (`paddingTop 18 / paddingBottom 16 / gap lewat
   margin`): hero jadi 322px, lebih tinggi dari 274px di file karena badge kini di luar
   ring. Tanpa ini baris cuaca hanya berjarak 3,4px dari tepi kartu di screenshot acuan.
8. **Langit hero memakai `heroSky` `#c6ecfe`, bukan `sky` `#d9eeff`.** Nilai itu diukur
   dari export (piksel di x=8 dan x=382 sama, jadi gradiennya vertikal, bertangga
   #c6ecfe → #eef6ff). Dengan `#d9eeff` bagian atas hero terlalu pucat sehingga alur
   (track) ring `#dfecfd` nyaris tak terlihat: selisih kanal merah hanya 5, sekarang 23.
9. **Glow off-white di hero dikembalikan** (`HeroGlow` di `src/components/ui.tsx`) —
   ini yang membuat gauge terasa "kurang": export punya bidang datar `#fcfcff`
   bertepi lembut, x 130..265 dan dari sedikit di atas pusat ring sampai melewati tepi
   bawah kartu, sehingga teks di bawah gauge duduk di atas putih, bukan di atas langit.
   Geometrinya memakai persentase dan sudah dicocokkan: kotak datarnya sekarang
   x 127..264, y 173..434 (hero 390×322) versus 130..265, 176..374 di export.
10. **Kontras & target sentuh** lain sengaja dibiarkan sesuai desain agar tetap setia.

## Catatan implementasi yang mudah terlewat

- **Bottom nav kustom tidak menerima `navigation`.** Render prop `tabBar` di Expo Router
  hanya membawa `state`, sehingga `navigation.emit('tabPress')` melempar
  "Cannot read properties of undefined (reading 'emit')" dan menekan tab tidak melakukan
  apa pun. Navigasi kini lewat `router.navigate()` dan status aktif diambil dari
  `usePathname()`.
- **Permintaan API di-cache.** Satu mount layar sebelumnya menembak enam request
  (pembacaan saat ini, cuaca, empat lokasi populer) dan beberapa kali reload sudah cukup
  memicu HTTP 429 dari Open-Meteo. Sekarang ada TTL cache in-memory: 5 menit untuk
  pembacaan saat ini & AQI per lokasi, 15 menit untuk seri harian.

## Notifikasi: bukan data palsu

Tidak ada backend, jadi layar Notifikasi **tidak** diisi riwayat karangan. Store
(`src/state/notifications.ts`) mulai kosong dan hanya mencatat kejadian nyata: perubahan
kategori AQI yang teramati saat aplikasi berjalan. Karena itu tampilan awalnya adalah
empty state, bukan daftar contoh.

## Yang masih perkiraan (perlu diverifikasi ke Figma)

- **Isi Notifikasi, Tips Kesehatan, Detail Lokasi, dan Splash.** Keempat node ini tidak
  pernah mengembalikan isi dari API (HTTP 429), jadi struktur layarnya mengikuti layar
  lain yang sudah terbaca, dan copy-nya disusun sendiri. Angka di dalamnya tetap data
  asli. Splash hanya diketahui latar `#d9eeff` dan transisi 300ms dari file.

- **Geometri jalan & sungai di layar Peta.** Figma menyimpannya sebagai node gambar
  vektor; permintaan `geometry=paths` selalu ditolak rate limit (HTTP 429). Saat ini
  digambar sebagai jaringan jalan perkiraan. Posisi taman, label kawasan, dan marker
  memakai koordinat asli dari file.
- **Label baris Pengaturan di Profil** (`Notifikasi`, `Lokasi favorit`, `Unit & format`,
  `Privasi & keamanan`, `Bantuan`, `Tentang Awanin`): teks node tidak ikut terkirim oleh
  API (rate limit); ukuran baris (64), padding (16), dan pemisah tetap sesuai file.
- **Kartu "Rekomendasi aktivitas"** dan **"Tips singkat"** di Beranda: sama, copy-nya
  disusun ulang; angka di dalamnya memakai data asli.
- **Sumber gambar** (foto lokasi, ilustrasi kota) tidak tersedia — diganti gradien
  `#d9eeff → #eaf3ff`.
- **Baris ketiga di bawah tiap tile "Lokasi Populer".** Di export, satu kolom tile
  berisi: thumbnail (y 524..604), nama (614..622), lalu DUA baris lagi (634..642 dan
  654..660). Implementasi kita hanya punya thumbnail + nama + baris nilai AQI. Copy dua
  baris itu belum bisa dibaca (ukurannya 11px; probe PNG di `awanin-figma/` tidak
  melakukan OCR), jadi tidak diisi dengan teks karangan.
- **Pencarian lokasi** di Peta baru tampilan, belum fungsional.
