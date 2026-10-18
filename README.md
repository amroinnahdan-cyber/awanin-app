# Awanin — mobile app (Expo / React Native)

**Know Your Air** — aplikasi kualitas udara untuk Jakarta Pusat, dibangun dari file Figma
**Awanin Mobile App** (canvas `Hi-Fi`, node `3:2`).

## Menjalankan

```bash
cd awanin-app
npm install          # atau: npx expo install
npx expo start       # tekan w / a / i, atau pakai Expo Go
```

Pemeriksaan:

```bash
npm install          # WAJIB dulu — lint memakai eslint lokal dari node_modules
npm run lint         # = npx eslint .
npx tsc --noEmit     # typecheck
```

> `npx expo lint` / `npx eslint .` tanpa `npm install` menarik ESLint dari registry
> dengan versi berbeda yang menolak `eslint/config`, jadi script `lint` sekarang
> langsung memanggil `eslint .` dengan dependensi lokal.

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
| `/lokasi/[slug]` | Detail Lokasi (Monas, Bundaran HI, GBK, Kota Tua) | `2027:8300` |

Navigasi memakai Expo Router (`src/app/`) dengan bottom nav kustom yang mengikuti
geometri Figma: 12 top + 41 item + 18 gap + 4 home indicator + 7 bottom = 82.

Alur yang sudah tersambung: bell di Beranda → Notifikasi, kartu Lokasi Populer → Detail
Lokasi, kartu pratinjau lokasi di Peta → Detail Lokasi, tombol "Lihat Rute" di Detail →
Peta, dan kartu "Rekomendasi" di Detail → Tips Kesehatan.

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

Warna brand: **`#1854c8`** — dipakai seragam oleh logo (diolah ulang lewat
[`tools/process-logo.py`](tools/process-logo.py)) dan aksen UI. Sumber logo asli
(`assets/logo-source.png`) memang `#245dc5`; alpha unmixing tetap memakai warna
asli itu, tetapi semua aset turunan dicat dengan `#1854c8` supaya aplikasi hanya
memiliki satu biru brand.

## Aset gambar showcase

UI mengikuti design showcase **Awanin Air Quality App**. Gambar-gambarnya dihasilkan
AI dan disimpan di `assets/`:

| Aset | Dipakai untuk |
|---|---|
| `img-splash.jpg` | Ilustrasi Splash (langit, awan, skyline Monas) |
| `img-monas.jpg` | Hero Detail Lokasi + tile Lokasi Populer + kartu pratinjau Peta |
| `img-bundaran-hi.jpg` | idem, untuk Bundaran HI |
| `img-gbk.jpg` | idem, untuk GBK |
| `img-kota-tua.jpg` | idem, untuk Kota Tua |
| `img-mascot.jpg` | Maskot awan di layar Tips Kesehatan |

Lokasi yang dipantau mengikuti showcase: **Monas, Bundaran HI, GBK, Kota Tua**
(ditambah Jakarta Pusat sebagai lokasi default) — sebelumnya Sudirman & Menteng.

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
2. **Label kategori AQI memakai label pendek di dalam ring** (ala showcase), bukan
   nama kategori panjang: pada tinggi badge, lebar dalam lingkaran hanya ~124px
   sementara "Tidak Sehat untuk Sensitif" butuh ~154px. Badge di dalam ring karena
   itu memakai `category.short` ("Baik", "Sedang", "Sensitif", …) dengan
   `maxWidth 132px` + `numberOfLines=1`, sehingga tetap satu baris dan tidak
   menabrak busur.
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
11. **Skala ring AQI dibuat piecewise, bukan linear 0–500.** Pemetaan linear membuat
    bacaan sehari-hari (AQI 40–90) cuma mengisi 8–18% busur sehingga ring terasa
    kosong. `gaugeProgress()` kini memetakan batas kategori ke posisi busur tetap
    (50 → 30%, 100 → 50%, 150 → 66%, 200 → 78%, 300 → 90%, 500 → 100%): rentang
    0–100 mendapat dua pertiga ruang visual. Legenda skala di bawahnya tetap linear
    berlabel angka, karena sumbu berlabel harus jujur.
12. **Profil memakai data contoh netral** (`USER_PROFILE` di `src/state/app.ts`):
    "Pengguna Awanin" / inisial "PA". Tidak ada sistem akun, dan menanam nama asli
    di dalam bundle adalah kebocoran privasi.

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

Tidak ada backend, jadi feed notifikasi **tidak** diisi riwayat karangan. Store
(`src/state/notifications.ts`) mulai kosong dan hanya mencatat kejadian nyata: perubahan
kategori AQI yang teramati saat aplikasi berjalan (tampil di kartu "Terbaru" pada layar
Notifikasi). Layar Notifikasi sendiri mengikuti showcase: **pengaturan** yang
benar-benar mengendalikan perilaku —

- **Peringatan Kualitas Udara** — sakelar induk untuk semua peringatan.
- **Peringatan AQI Tinggi** — feed perubahan kategori (baseline tetap dilacak, jadi
  menyalakan ulang tidak mengulang perubahan lama).
- **Tips Kesehatan** — menyertakan tips singkat di badan tiap notifikasi.
- **Update Cuaca** — ringkasan harian (AQI + cuaca), sekali per hari.
- **Lokasi Notifikasi** — mengikuti lokasi yang dipilih.

Riwayat notifikasi (maksimal 20), baseline kategori, dan pengaturan tersimpan di
perangkat lewat AsyncStorage (`src/lib/persist.ts`, di web memakai localStorage),
jadi tidak hilang saat aplikasi ditutup. "Bersihkan" & "Keluar" mengembalikan ke
kondisi awal.

Push notification tingkat OS (tetap masuk saat aplikasi tertutup) sengaja tidak
dipasang: itu butuh `expo-notifications` + development build dan untuk notifikasi
remote butuh backend — di luar jangkauan aplikasi tanpa server ini.

## Yang masih perkiraan

- **Geometri jalan & sungai di layar Peta.** Figma menyimpannya sebagai node gambar
  vektor dan permintaan `geometry=paths` selalu ditolak rate limit (HTTP 429). Jaringan
  jalan digambar ulang sebagai stylised map yang lebih padat (arteri melewati keempat
  marker, sungai ala Ciliwung di sisi timur Monas), tetapi tetap bukan geometri asli.
  Posisi taman, label kawasan, dan marker memakai koordinat dari file.

Pencarian lokasi di Peta **berfungsi**: baris "Cari lokasi..." membuka
sheet pemilih lokasi yang punya kolom pencarian nyata (filter nama/area, empty state,
tombol hapus), plus chip filter kategori Semua / Baik / Sedang / Tidak Sehat.
