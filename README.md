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
│  Beranda · Sekitar   │ ◀─────────────────────── │  Express + SQLite        │
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
npm test             # jest (74 tes)
npm run check        # ketiganya sekaligus

cd server
npm run typecheck && npm test   # node:test + supertest (23 tes)
```

CI GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) menjalankan
lint, typecheck, tes aplikasi, lalu typecheck, tes, dan build backend pada setiap push.

## Rilis APK (signing)

[`.github/workflows/release-apk.yml`](.github/workflows/release-apk.yml) membangun APK dari
tag `v*` (atau `workflow_dispatch`) dan mengunggahnya ke GitHub Releases. APK itu **wajib**
memakai keystore rilis yang sama selamanya: Android hanya menerima update yang
ditandatangani dengan kunci yang sama, jadi kalau kuncinya berubah semua pengguna harus
uninstall dulu. Karena itu workflow **berhenti** kalau secret-nya belum diisi, bukan
menerbitkan APK debug-signed.

**Sekali saja — buat keystore** (simpan file dan password-nya; kalau hilang, aplikasi tidak
bisa di-update lagi dan harus terbit sebagai aplikasi baru):

```bash
keytool -genkeypair -v \
  -keystore awanin-release.keystore \
  -alias awanin \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12 \
  -dname "CN=Awanin, O=Awanin, C=ID"
```

**Tambahkan empat secret** di Settings → Secrets and variables → Actions. Semua nilai satu
baris (tanpa newline):

| Secret | Isi |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | hasil `base64 -w 0 awanin-release.keystore` (macOS: `base64 -i awanin-release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | password keystore |
| `ANDROID_KEY_ALIAS` | `awanin` |
| `ANDROID_KEY_PASSWORD` | password key — untuk PKCS12 sama dengan password keystore |

Alurnya: CI men-decode keystore ke `$RUNNER_TEMP` (di luar workspace, jadi tidak pernah
ter-commit atau ter-upload sebagai artefak), memastikan `keytool` bisa membukanya, lalu
`expo prebuild` + `assembleRelease`. Setelah build, sertifikat APK dibandingkan dengan
sidik jari SHA-256 keystore; kalau berbeda, build gagal.

**Langkah tiap rilis.** Rilis pertama yang bertanda tangan asli adalah **1.2.0**:

1. Naikkan `expo.version` di `app.json` **dan** `android.versionCode` + `ios.buildNumber`
   (integer, harus lebih besar dari rilis sebelumnya — Android menolak APK dengan
   versionCode lebih kecil dari yang terpasang). Versi di layar Profil ikut otomatis karena
   dibaca dari `Constants.expoConfig`.
2. Commit, lalu buat tag yang **sama persis** dengan versi itu:
   `git tag v1.2.0 && git push origin v1.2.0`. Workflow berhenti kalau tag dan `app.json`
   tidak cocok, supaya tidak menimpa rilis versi lain.
3. Pantau tab Actions. Sebelum upload, sertifikat APK dibandingkan dengan keystore rilis;
   kalau berbeda, tidak ada yang terbit.
4. Rilis `v1.1.0` yang lama masih bertanda tangan debug. Pengguna yang memasangnya harus
   uninstall sekali sebelum memasang 1.2.0 — pertimbangkan menghapus atau menandai rilis
   lama itu di halaman Releases.

Baris `signingConfig` tidak diedit manual di `android/app/build.gradle`, karena folder itu
dihasilkan `expo prebuild`. Aturannya ada di
[`plugins/withReleaseSigning.js`](plugins/withReleaseSigning.js): buildType `release`
memakai `signingConfigs.release` saat `AWANIN_KEYSTORE_FILE` tersedia, dan jatuh ke debug
keystore hanya untuk build lokal tanpa secret — jangan diunggah sebagai rilis.

## Layar (canvas Hi-Fi + tambahan)

| Rute | Layar | Node Figma |
|---|---|---|
| — (overlay saat launch) | Splash Screen | `2027:8125` |
| `/` | Beranda / Air Quality Dashboard | `2027:8143` |
| `/sekitar` | Sekitar — kualitas udara di posisi perangkat | — (tanpa peta) |
| `/riwayat` | Riwayat Kualitas Udara | `2027:8376` |
| `/profil` | Profil | `2027:8531` |
| `/notifikasi` | Notifikasi | `2027:8607` |
| `/tips` | Tips Kesehatan | `2027:8473` |
| `/lokasi/[slug]` | Detail Lokasi (Monas, Bundaran HI, GBK, Kota Tua, kota nasional) | `2027:8300` |
| `/indonesia` | Kualitas Udara Indonesia — 100 kota, 38 provinsi | — (tambahan) |

Navigasi memakai Expo Router (`src/app/`) dengan bottom nav kustom yang mengikuti
geometri Figma: 12 top + 41 item + 18 gap + 4 home indicator + 7 bottom = 82.

Beranda juga menampilkan **Waktu terbaik olahraga hari ini**: jendela dua jam dengan
rata-rata AQI terendah di antara jam-jam yang masih tersisa (dihitung dari prakiraan
per jam), plus saran intensitas berdasarkan kategori AQI jendela itu. Bila sisa hari
relatif rata, kartu menyebutkannya alih-alih memilih pemenang dari selisih kecil.

Bagian **“Udara terbaik & terburuk”** di Beranda menggantikan strip “Lokasi Populer”:
tiga kota terbersih dan tiga kota paling berpolusi hari ini, lengkap dengan provinsi,
peringkat nasional, AQI berwarna, dan perubahan 24 jam (▲ naik = memburuk, ▼ turun =
membaik, dibanding jam yang sama kemarin). Monas, Bundaran HI, GBK, dan Kota Tua
berjarak <5 km dan jatuh di sel grid model yang sama, jadi keempat kartu lama hampir
selalu mengulang satu angka. Ketuk kota di daftar baru untuk menjadikannya lokasi aktif
sekaligus membuka detailnya; “Lihat semua” membuka layar nasional (rata-rata nasional,
pencarian kota/provinsi, filter kategori, dan peringkat 100 kota). Delta 24 jam yang
sama juga muncul di setiap baris peringkat nasional dan di bawah ring AQI pada Detail
Lokasi, sehingga trennya konsisten di ketiga layar.

Seluruh 100 kota diambil dalam **satu** permintaan Open-Meteo (koordinat dipisah koma),
di-cache 10 menit dan dipakai bersama oleh Beranda dan layar nasional, dengan refresh
manual dibatasi satu menit agar kuota gratis (600/menit, 10.000/hari) tidak habis karena
pull-to-refresh berulang. Perubahan 24 jam butuh request tambahan (`hourly=us_aqi`,
`past_hours=25&forecast_hours=1` = 26 sampel): Beranda hanya meminta enam kota yang
tampil, layar nasional meminta sisanya untuk delta di setiap baris, dan Detail Lokasi
meminta satu titik. Cache disimpan **per kota** selama 30 menit, jadi membuka Beranda
lalu layar nasional hanya mengirim request untuk kota yang belum punya delta. Karena
Beranda ikut memicu dua request itu, jalur langsung ke Open-Meteo adalah hal pertama
yang perlu dipindah ke cache backend bila aplikasi dipakai banyak orang.

Alur yang tersambung: bell di Beranda → Notifikasi, baris kota di “Udara terbaik &
terburuk” → Detail Lokasi (sekaligus memilih lokasi itu), “Lihat semua” → peringkat
nasional → Detail kota, baris lokasi di Sekitar → Detail Lokasi, tombol "Lihat di
Sekitar" di Detail → Sekitar, dan kartu "Rekomendasi" di Detail → Tips Kesehatan.

Splash mengikuti prototype Figma dengan revisi visual: latar gradasi langit (terang
`#f6fbff → #dcedff → #eaf4ff`, gelap `#0b2038 → #0d1420`), glyph Awanin di dalam tile
bergaya ikon aplikasi, wordmark `awanin`, dan tagline **Know Your Air**. Tile-nya
sengaja terang di kedua tema supaya glyph biru tetap kontras — versi sebelumnya
menaruh lock-up biru di atas `colors.sky` gelap (`#16324f`), yang praktis tidak
terbaca. Transisi 300ms ease-out dan ketuk-untuk-masuk tetap seperti prototype.
Kunjungan pertama menampilkan onboarding singkat yang bisa dilewati.

## Backend

Ringkasan lengkap ada di [`server/README.md`](server/README.md) dan referensi
interaktif di `http://localhost:4000/docs` (spesifikasi OpenAPI 3.1:
`/openapi.json`, sumbernya [`server/src/openapi.ts`](server/src/openapi.ts)).

| Metode | Endpoint | Dipakai aplikasi untuk |
|---|---|---|
| `GET` | `/v1/air?lat&lon` | Beranda, Sekitar, Detail Lokasi |
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

## Landing page

Website publik produk ada di [`landing/`](landing) — satu berkas statis
(`landing/index.html`, tanpa build step) berisi hero, fitur, galeri layar Figma,
bagian data & atribusi, dan tautan unduhan. Menjalankan: buka filenya langsung
atau `cd landing && python -m http.server 8123`. Bisa dipublikasikan apa adanya
ke GitHub Pages / Netlify / Cloudflare Pages (lihat [`landing/README.md`](landing/README.md)).

## Logo & ikon aplikasi

Logo sumber (biru datar di atas `#f8f7f5`) diolah oleh
[`tools/process-logo.py`](tools/process-logo.py) — tanpa dependensi, karena lingkungan ini
tidak punya Pillow/ImageMagick; skripnya memuat dekoder/encoder PNG sendiri.

Skrip memisahkan artwork menjadi dua pita scanline (glyph awan dan wordmark), lalu
menghasilkan:

| Aset | Ukuran | Dipakai untuk |
|---|---|---|
| `assets/logo-source.png` | 1254² | arsip asli |
| `assets/logo-lockup.png` | 720×542 | arsip (splash kini memakai glyph + wordmark teks) |
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
| `img-monas.jpg` | Hero Detail Lokasi + tile Lokasi Populer + kartu lokasi aktif |
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
(`/` untuk Notifikasi & Tips, `/sekitar` untuk Detail Lokasi).

## Sumber data

**Open-Meteo** — https://open-meteo.com — tanpa API key, tanpa registrasi.

- Kualitas udara: `air-quality-api.open-meteo.com/v1/air-quality`
  (`us_aqi`, `pm2_5`, `pm10`, `nitrogen_dioxide`, `ozone`, …)
- Cuaca: `api.open-meteo.com/v1/forecast` (`temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`)
- Riwayat: `hourly=us_aqi&past_days=7|30`, diagregasi menjadi rata-rata/maks/min harian
- Nasional: `latitude=-2.1,-6.2,…&longitude=113.9,106.8,…&current=us_aqi` — satu
  permintaan untuk 100 kota, respons berupa array sesuai urutan koordinat

Data Open-Meteo untuk Jakarta berasal dari model global CAMS (~45 km, 3-jaman),
bukan stasiun pengukuran setempat. Lisensi non-komersial, atribusi wajib — ditampilkan
di footer Beranda dan layar Tentang.

Daftar kota nasional berasal dari **GeoNames** ([`ID.zip`](https://download.geonames.org/export/dump/ID.zip),
lisensi CC BY 4.0): populated places, dikurangi menjadi ibu kota 38 provinsi plus kota
terbesar, dengan kota yang berjarak < 20 km dari pilihan yang lebih besar dibuang agar
sprawl Jabodetabek tidak memenuhi daftar. Nama provinsi diterjemahkan ke bahasa
Indonesia dan beberapa ejaan diperbaiki. Atribusi GeoNames tampil di footer layar
`/indonesia` dan di layar Tentang.

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

- **Layar Sekitar tidak memakai peta.** Versi sebelumnya menggambar peta Jakarta secara
  manual (geometri asli di Figma tidak bisa diambil), sehingga posisi marker hanya
  ilustratif. Sekarang layar itu membaca GPS perangkat dan mengurutkan lima lokasi
  terpantau berdasarkan **jarak sebenarnya** (haversine), jadi tidak ada lagi gambar
  peta maupun proyeksi koordinat ke kanvas.

Pemilih lokasi tetap tersedia di sheet lokasi (Beranda, Riwayat, Notifikasi): kolom
pencarian nyata (filter nama/area, empty state, tombol hapus) plus tombol deteksi
lokasi perangkat.

## Lisensi & atribusi

Kode aplikasi: MIT (lihat [`LICENSE`](LICENSE)). Data kualitas udara dan cuaca:
[Open-Meteo](https://open-meteo.com), lisensi non-komersial — atribusi ditampilkan di
Beranda dan disertakan pada setiap respons API.
