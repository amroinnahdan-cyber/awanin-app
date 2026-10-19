# Awanin — air quality app (Expo + Node API)

**Know Your Air** — aplikasi kualitas udara untuk Jakarta Pusat, dibangun dari file Figma
**Awanin Mobile App** (canvas `Hi-Fi`, node `3:2`), dengan backend sendiri untuk cache,
riwayat, dan push notification.

| Bagian | Teknologi | Lokasi |
|---|---|---|
| Aplikasi | Expo 58 / React Native 0.88 / Expo Router | `src/` |
| Backend | Node 22+ / Express 4 / SQLite (`node:sqlite`) / zod | [`server/`](server) |
| Data | Open-Meteo Air Quality & Weather (tanpa API key) | upstream |

## Arsitektur

```
┌──────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│  Awanin app (Expo)   │ ───────────────────────▶ │  awanin-server           │
│  Beranda · Peta      │ ◀─────────────────────── │  Express + SQLite        │
│  Riwayat · Profil    │   reading, forecast,     │  cache · device registry │
│  Notifikasi          │   history, subscription  │  scheduler · Expo push   │
└─────────┬────────────┘                          └────────────┬─────────────┘
          │                                                    │
          │ fallback langsung (backend mati / belum diset)     │ 1 request / 10 menit
          ▼                                                    ▼
   Open-Meteo Air Quality + Weather API  ◀──────────────────────┘
```

Aplikasi memilih sumber data secara berurutan lewat [`src/api/gateway.ts`](src/api/gateway.ts):

1. **Backend** — data bersama, riwayat, prakiraan, dan langganan push;
2. **Open-Meteo langsung** — kalau backend tidak dikonfigurasi atau sedang mati,
   aplikasi tetap berfungsi penuh tanpa server;
3. **Cache perangkat** — bacaan terakhir yang tersimpan, ditandai `stale` beserta
   umurnya, bukan kartu error.

## Menjalankan

```bash
# 1. Backend
cd server
npm install
cp .env.example .env     # opsional, semua nilai punya default
npm run dev              # http://localhost:4000  (docs: /docs)

# 2. Aplikasi (terminal lain)
cd awanin-app
npm install
cp .env.example .env     # EXPO_PUBLIC_API_URL=http://localhost:4000
npx expo start           # tekan w / a / i, atau Expo Go
```

`npm run api` dari folder aplikasi menjalankan backend tanpa pindah direktori.

Catatan URL backend:

| Menjalankan di | `EXPO_PUBLIC_API_URL` |
|---|---|
| Web / iOS simulator | `http://localhost:4000` |
| Emulator Android | `http://10.0.2.2:4000` |
| HP fisik (Expo Go) | `http://<IP-LAN-komputer>:4000` |

Tanpa variabel itu aplikasi berjalan dalam **direct mode**: semua request ke
Open-Meteo, push dinonaktifkan, dan tidak ada cache bersama.

### Emulator Android — `Activity class {…HomeActivity} does not exist`

Gejalanya seperti ini di terminal Expo:

```
› Opening emulator Pixel_9
› Opening exp://10.90.200.90:8082 on Pixel_9
CommandError: Activity class {host.exp.exponent/host.exp.exponent.experience.HomeActivity} does not exist.
```

Ini bukan error kode aplikasi dan bukan error Metro: bundel tidak pernah diminta,
`adb` sudah gagal lebih dulu saat membuka Expo Go. Artinya paket `host.exp.exponent`
masih terdaftar di emulator, tetapi APK-nya tidak benar-benar ada/selesai terpasang
(misalnya sisa snapshot AVD lama, atau unduhan Expo Go 58.0.4 terputus).

1. Pastikan emulator benar-benar selesai boot dan hanya ada satu perangkat:
   `adb devices`, lalu `adb shell getprop sys.boot_completed` harus `1`.
2. Cek apa yang terpasang:
   `adb shell dumpsys package host.exp.exponent | grep -E "versionName|codePath"`
   (PowerShell: `... | Select-String "versionName|codePath"`).
   Untuk SDK 58, versi yang benar adalah **58.0.4**.
3. Hapus paketnya, lalu biarkan Expo CLI memasang ulang:
   ```bash
   adb uninstall host.exp.exponent
   npx expo start --clear      # lalu tekan a
   ```
   CLI akan mengunduh Expo Go 58.0.4 (~226 MB) dan memasangnya sendiri. Expo Go
   yang sama juga dipakai di HP fisik, jadi unduhan ini hanya sekali.
4. Kalau langkah 3 masih gagal, pasang manual:
   [Expo-Go-58.0.4.apk](https://github.com/expo/expo-go-releases/releases/download/Expo-Go-58.0.4/Expo-Go-58.0.4.apk)
   ```bash
   adb install -r Expo-Go-58.0.4.apk
   ```
5. Kalau tetap: **Wipe Data** AVD (Device Manager → ⋮ → Wipe Data) atau cold boot
   `emulator -avd Pixel_9 -no-snapshot-load`, lalu ulangi langkah 3.

Catatan: Expo Go di Play Store saat ini masih SDK 57, jadi untuk proyek SDK 58 ini
CLI akan menawarkan (dan sebaiknya diizinkan) menggantinya dengan Expo Go 58.0.4.
Tanpa emulator, `npx expo start --web` atau scan QR dengan Expo Go di HP juga bisa.

### Pemeriksaan

```bash
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit
npm test             # jest (20 tes)
npm run check        # ketiganya sekaligus

cd server
npm run typecheck && npm test   # node:test + supertest (23 tes)
```

CI GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) menjalankan
lint, typecheck, tes aplikasi, lalu typecheck, tes, dan build backend pada setiap push.

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

Alur yang tersambung: bell di Beranda → Notifikasi, kartu Lokasi Populer → Detail
Lokasi, kartu pratinjau lokasi di Peta → Detail Lokasi, tombol "Lihat Rute" di Detail →
Peta, dan kartu "Rekomendasi" di Detail → Tips Kesehatan.

Splash mengikuti prototype Figma: latar `#d9eeff`, transisi 300ms ease-out, dan bisa
diketuk untuk langsung masuk. Isinya memakai logo asli Awanin, bukan ikon pengganti.
Kunjungan pertama menampilkan onboarding singkat yang bisa dilewati.

## Backend

Ringkasan lengkap ada di [`server/README.md`](server/README.md) dan referensi
interaktif di `http://localhost:4000/docs` (spesifikasi OpenAPI 3.1:
`/openapi.json`, sumbernya [`server/src/openapi.ts`](server/src/openapi.ts)).

| Metode | Endpoint | Dipakai aplikasi untuk |
|---|---|---|
| `GET` | `/v1/air?lat&lon` | Beranda, Peta, Detail Lokasi |
| `GET` | `/v1/air/:slug/history?days=7\|30` | Riwayat |
| `GET` | `/v1/locations` | AQI semua kawasan |
| `POST/PATCH/DELETE` | `/v1/devices` | Registrasi token push & preferensi |
| `POST` | `/v1/devices/:id/test` | Tombol "Uji notifikasi" |
| `GET` | `/v1/devices/:id/notifications` | Feed notifikasi dari server |

Yang dikerjakan server:

- **Cache bersama.** Snapshot Open-Meteo disimpan 10 menit (riwayat 15 menit), jadi
  satu polling melayani semua pengguna alih-alih satu request per layar.
- **Fallback jujur.** Kalau upstream gagal, snapshot terakhir dikirim dengan
  `stale: true`; aplikasi menampilkan badge "data tersimpan".
- **Riwayat.** Satu baris per bucket 15 menit pada tabel `readings`, dipakai endpoint
  tren dan dievaluasi scheduler.
- **Push alert.** Scheduler 15 menit membandingkan kategori AQI tiap lokasi dengan
  preferensi perangkat: hanya kirim saat **kategori berubah**, menghormati ambang,
  jam tenang (default 22:00–06:00 WIB), dan cooldown 180 menit.
- **Hardening.** Helmet, CORS allow-list, rate limit 180 req/menit, batas body 16 kB,
  validasi zod, dan error JSON seragam (`{ error, code }`).

Push notification tingkat OS membutuhkan **development build / build produksi**
(Expo Go tidak lagi mendukung remote push) dan token `ExponentPushToken[...]`.
Di web aplikasi mendeteksi keterbatasan ini dan menampilkan "Push jarak jauh belum
didukung di web" tanpa mengganggu notifikasi dalam aplikasi.

### Menguji backend dengan cepat

```bash
curl http://localhost:4000/health
curl "http://localhost:4000/v1/air?lat=-6.1754&lon=106.8272"
curl "http://localhost:4000/v1/air/monas/history?days=7"

curl -X POST http://localhost:4000/v1/devices \
  -H 'content-type: application/json' \
  -d '{"deviceId":"android:demo-0001","platform":"android"}'
```

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
bukan stasiun pengukuran setempat. Lisensi non-komersial, atribusi wajib — ditampilkan
di footer Beranda.

Open-Meteo hanya menerbitkan prakiraan AQI **lima hari**; hari keenam dan ketujuh
dikirim sebagai `null`. Backend membuang sampel kosong tersebut (bukan mengubahnya
menjadi AQI 0) dan strip prakiraan menyesuaikan judulnya dengan jumlah hari yang
tersedia, sehingga tidak ada lagi dua batang "0" di ujung grafik.

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
   busur 86,9px, jadi 174px.
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
10. **Kontras & target sentuh** lain sengaja dibiarkan sesuai desain agar tetap setia.
11. **Skala ring AQI dibuat piecewise, bukan linear 0–500.** Pemetaan linear membuat
    bacaan sehari-hari (AQI 40–90) cuma mengisi 8–18% busur sehingga ring terasa
    kosong. `gaugeProgress()` memetakan batas kategori ke posisi busur tetap
    (50 → 30%, 100 → 50%, 150 → 66%, 200 → 78%, 300 → 90%, 500 → 100%): rentang
    0–100 mendapat dua pertiga ruang visual. Legenda skala di bawahnya tetap linear
    berlabel angka, karena sumbu berlabel harus jujur.
12. **Profil memakai data contoh lokal** (`USER_PROFILE` di `src/state/app.ts`).
    Tidak ada sistem akun: identitas ini hanya tampilan dan bisa diganti tanpa
    menyentuh backend, karena `deviceId` anonim yang dipakai untuk push.

## Catatan implementasi yang mudah terlewat

- **Bottom nav kustom tidak menerima `navigation`.** Render prop `tabBar` di Expo Router
  hanya membawa `state`, sehingga `navigation.emit('tabPress')` melempar
  "Cannot read properties of undefined (reading 'emit')" dan menekan tab tidak melakukan
  apa pun. Navigasi kini lewat `router.navigate()` dan status aktif diambil dari
  `usePathname()`.
- **Permintaan API di-cache.** Satu mount layar sebelumnya menembak enam request
  (pembacaan saat ini, cuaca, empat lokasi populer) dan beberapa kali reload sudah cukup
  memicu HTTP 429 dari Open-Meteo. Sekarang ada TTL cache in-memory: 5 menit untuk
  pembacaan saat ini & AQI per lokasi, 15 menit untuk seri harian, ditambah cache
  perangkat untuk kondisi offline.
- **`/v1/air` memakai bucket 15 menit.** Request berulang dari banyak pengguna
  menulis satu baris `readings`, bukan satu baris per request.

## Notifikasi

Dua lapis, keduanya nyata:

**Dalam aplikasi** (`src/state/notifications.ts`) — feed dimulai kosong dan hanya
mencatat kejadian yang benar-benar teramati: perubahan kategori AQI saat aplikasi
berjalan, ringkasan harian, dan hasil push uji. Maksimal 20 entri, disimpan lewat
AsyncStorage/localStorage (`src/lib/persist.ts`).

**Push jarak jauh** — `src/hooks/useRemoteNotifications.ts` mendaftarkan `deviceId`
anonim + token Expo ke backend, menyinkronkan preferensi (lokasi, ambang, jam tenang),
dan membaca riwayat notifikasi server. Server yang memutuskan kapan mengirim, jadi
alert tetap datang walau aplikasi tertutup (butuh development build, bukan Expo Go).

**Expo Go di Android** tidak membawa `ExpoTopicSubscriptionModule` (push jarak jauh
dihapus dari Expo Go sejak SDK 53), padahal `expo-notifications` me-resolve modul itu
saat index-nya dievaluasi. Karena itu [`src/lib/push.ts`](src/lib/push.ts) sengaja
**tidak menyentuh paket tersebut sama sekali** saat `isRunningInExpoGo()` bernilai
true di Android — `try { require(...) } catch {}` tidak menolong di sini, sebab Metro
melaporkan kegagalan evaluasi modul lewat `ErrorUtils.reportFatalError` (tanpa
melempar ulang), sehingga RedBox muncul walau ada `catch`. Di runtime itu push
dilaporkan `unsupported` dengan alasan yang bisa dibaca pengguna.

Pengaturan di layar Notifikasi mengendalikan keduanya: **Peringatan Kualitas Udara**
(sakelar induk), **Peringatan AQI Tinggi** (feed perubahan kategori), **Tips Kesehatan**
(sertakan saran di badan notifikasi), **Update Cuaca** (ringkasan harian), dan
**Lokasi Notifikasi**.

## Yang masih perkiraan

- **Geometri jalan & sungai di layar Peta.** Figma menyimpannya sebagai node gambar
  vektor dan permintaan `geometry=paths` selalu ditolak rate limit (HTTP 429). Jaringan
  jalan digambar ulang sebagai stylised map yang lebih padat (arteri melewati keempat
  marker, sungai ala Ciliwung di sisi timur Monas), tetapi tetap bukan geometri asli.
  Posisi taman, label kawasan, dan marker memakai koordinat dari file.

Pencarian lokasi di Peta **berfungsi**: baris "Cari lokasi..." membuka sheet pemilih
lokasi yang punya kolom pencarian nyata (filter nama/area, empty state, tombol hapus),
plus chip filter kategori Semua / Baik / Sedang / Tidak Sehat.

## Lisensi & atribusi

Kode aplikasi: MIT (lihat [`LICENSE`](LICENSE)). Data kualitas udara dan cuaca:
[Open-Meteo](https://open-meteo.com), lisensi non-komersial — atribusi ditampilkan di
Beranda dan disertakan pada setiap respons API.
