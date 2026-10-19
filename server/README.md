# awanin-server — backend Awanin

API kualitas udara untuk aplikasi Awanin. Tugasnya:

1. **mem-proxy dan meng-cache Open-Meteo** — satu `GET /v1/air` dari banyak pengguna
   tidak berubah menjadi satu panggilan upstream per pengguna;
2. **menyimpan riwayat** pembacaan per lokasi (SQLite) untuk tren dan audit;
3. **mengirim push notification** lewat Expo saat kategori AQI berubah, sesuai
   preferensi tiap perangkat (ambang, jam tenang, cooldown, ringkasan harian).

Dokumentasi interaktif: **`GET /docs`** · spesifikasi mesin: **`GET /openapi.json`**.

## Menjalankan

Butuh **Node.js ≥ 22.5** (memakai modul bawaan `node:sqlite`, tanpa native addon).

```bash
cd server
npm install
cp .env.example .env      # opsional; semua nilai punya default
npm run dev               # tsx watch, http://localhost:4000

npm run typecheck         # tsc --noEmit
npm test                  # node:test + supertest (in-memory SQLite)
npm run build && npm start
```

Aplikasi Expo membaca alamat API dari `EXPO_PUBLIC_API_URL` (lihat
[`../.env.example`](../.env.example)). Tanpa variabel itu aplikasi tetap berjalan
dalam *direct mode* ke Open-Meteo, tetapi push dan cache bersama tidak aktif.

## Endpoint

| Metode | Path | Keterangan |
|---|---|---|
| `GET` | `/health` | Status layanan + cek database |
| `GET` | `/v1/locations` | Lima lokasi tetap + AQI terakhir |
| `GET` | `/v1/air?lat&lon` atau `?slug` | Pembacaan, 48 jam ke depan, prakiraan harian |
| `GET` | `/v1/air/:slug` | Sama, untuk slug yang dikenal |
| `GET` | `/v1/air/:slug/history?days=7\|30` | Agregat harian (rata-rata, maks, min) |
| `GET` | `/v1/air/:slug/trend?hours=24` | Titik pembacaan yang dicatat scheduler |
| `POST` | `/v1/devices` | Registrasi idempoten + preferensi default |
| `GET` | `/v1/devices/:deviceId` | Perangkat, preferensi, notifikasi terakhir |
| `PATCH` | `/v1/devices/:deviceId` | Token push, platform, preferensi |
| `DELETE` | `/v1/devices/:deviceId` | Hapus perangkat (cascade) |
| `GET` | `/v1/devices/:deviceId/notifications?limit=20` | Riwayat notifikasi |
| `POST` | `/v1/devices/:deviceId/test` | Kirim satu push uji |

Contoh:

```bash
curl "http://localhost:4000/v1/air?lat=-6.1754&lon=106.8272" | jq '.reading.aqi, .forecast'
curl -X POST http://localhost:4000/v1/devices \
  -H 'content-type: application/json' \
  -d '{"deviceId":"android:demo-0001","platform":"android"}'
```

Format error selalu sama, sehingga klien bisa menampilkan pesan yang layak:

```json
{ "error": "Lokasi \"xyz\" tidak dikenal", "code": "unknown_location" }
```

## Konfigurasi

| Variabel | Default | Fungsi |
|---|---|---|
| `PORT` | `4000` | Port HTTP |
| `DATABASE_PATH` | `./data/awanin.db` | File SQLite (`:memory:` untuk tes) |
| `CORS_ORIGINS` | `http://localhost:8081,http://localhost:19006` | Daftar origin, `*` untuk semua |
| `POLL_INTERVAL_MINUTES` | `15` | Interval polling scheduler |
| `COOLDOWN_MINUTES` | `180` | Jeda minimum antar-alert per perangkat |
| `QUIET_START` / `QUIET_END` | `22:00` / `06:00` | Jam tenang default (Asia/Jakarta) |
| `EXPO_ACCESS_TOKEN` | — | Hanya jika Enhanced Push Security aktif |
| `LOG_LEVEL` | `info` | Level pino |

## Data & perilaku

- **Tabel**: `devices`, `preferences`, `notifications`, `readings`, `api_cache`.
  Skema dibuat idempoten saat boot (`src/db.ts`).
- **Cache upstream**: snapshot 10 menit, riwayat 15 menit. Kalau Open-Meteo gagal,
  snapshot terakhir tetap dikirim dengan `stale: true`; hanya bila tidak ada
  snapshot sama sekali endpoint menjawab `503`.
- **Scheduler**: setiap `POLL_INTERVAL_MINUTES` mengambil AQI semua titik yang
  dipantau, menyimpan satu baris per bucket 15 menit, lalu mengevaluasi alert.
  Alert hanya dikirim saat **kategori** berubah (bukan setiap poll), menghormati
  ambang perangkat, jam tenang, dan cooldown. Ringkasan harian dikirim sekali per
  hari setelah `QUIET_END`.
- **Push**: memakai Expo Push API (`https://exp.host/--/api/v2/push/send`), dengan
  validasi format token `ExponentPushToken[...]`. Token yang ditolak Expo dicatat
  sebagai `failed` beserta alasan pada riwayat notifikasi.
- **Keamanan dasar**: helmet, CORS allow-list, rate limit 180 req/menit per IP pada
  `/v1`, body JSON maksimal 16 kB, validasi zod, dan `x-powered-by` dimatikan.
  Tidak ada autentikasi pengguna: aplikasi memang tanpa akun, dan `deviceId`
  berfungsi sebagai kunci perangkat — jangan pernah memakai data pribadi di sana.

## Deployment

```bash
docker build -t awanin-server .
docker run -p 4000:4000 \
  -e CORS_ORIGINS="https://app.awanin.example" \
  -e EXPO_ACCESS_TOKEN="..." \
  -v awanin-data:/app/data \
  awanin-server
```

Catatan produksi:

- simpan `DATABASE_PATH` di volume persisten (SQLite butuh satu instance; untuk
  beberapa instance pindah ke Postgres);
- isi `CORS_ORIGINS` dengan origin web yang sebenarnya — `*` hanya untuk demo;
- healthcheck: `GET /health` (membuka koneksi database);
- pasang di belakang reverse proxy TLS; aplikasi memakai HTTPS secara default.

## Atribusi

Data kualitas udara dan cuaca berasal dari [Open-Meteo](https://open-meteo.com)
(lisensi non-komersial). Setiap respons `/v1/air*` menyertakan field `attribution`
dan aplikasi menampilkannya di layar Beranda.
