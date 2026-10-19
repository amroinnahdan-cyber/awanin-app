/**
 * OpenAPI description of the public API.
 *
 * Kept hand-written and dependency-free on purpose: the surface is small, the
 * document is served at `/openapi.json` for tooling (Postman, Insomnia,
 * `openapi-typescript`) and rendered as a human page at `/docs`.
 */

type Parameter = {
  name: string;
  in: 'query' | 'path';
  required?: boolean;
  description: string;
  schema: Record<string, unknown>;
};

type Operation = {
  tags: string[];
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: {
    required: boolean;
    content: { 'application/json': { schema: Record<string, unknown> } };
  };
  responses: Record<string, { description: string; content?: Record<string, unknown> }>;
};

export type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    license: { name: string; url: string };
  };
  servers: { url: string; description: string }[];
  tags: { name: string; description: string }[];
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
};

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/Error' } },
  },
});

const jsonResponse = (description: string, schema: Record<string, unknown>) => ({
  description,
  content: { 'application/json': { schema } },
});

const daySeries = {
  type: 'object',
  required: ['location', 'days', 'series'],
  properties: {
    location: { $ref: '#/components/schemas/Location' },
    days: { type: 'integer', example: 7 },
    series: { type: 'array', items: { $ref: '#/components/schemas/DayAqi' } },
    attribution: { type: 'string' },
  },
};

const slugParameter: Parameter = {
  name: 'slug',
  in: 'path',
  required: true,
  description: 'Location slug, e.g. `jakarta-pusat`, `monas`, `gbk`.',
  schema: { type: 'string', enum: ['jakarta-pusat', 'monas', 'bundaran-hi', 'gbk', 'kota-tua'] },
};

const deviceParameter: Parameter = {
  name: 'deviceId',
  in: 'path',
  required: true,
  description: 'Client-generated device id (8–128 chars: letters, digits, `:`, `_`, `-`).',
  schema: { type: 'string', example: 'web:9f2c1d7e' },
};

export const openApiDocument: OpenApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Awanin API',
    version: '1.0.0',
    description:
      'Backend for the Awanin air-quality app. Proxies and caches Open-Meteo, ' +
      'keeps a per-location reading history, and delivers Expo push alerts when ' +
      'the AQI category changes. All timestamps are ISO 8601; air-quality times ' +
      'are already localised to Asia/Jakarta by the upstream.',
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Lokal (default)' },
    { url: 'https://api.awanin.app', description: 'Contoh produksi' },
  ],
  tags: [
    { name: 'Sistem', description: 'Kesehatan layanan.' },
    { name: 'Kualitas udara', description: 'Pembacaan, prakiraan, riwayat.' },
    { name: 'Perangkat', description: 'Registrasi perangkat dan preferensi notifikasi.' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistem'],
        summary: 'Health check',
        description: 'Membuka koneksi database dan melaporkan versi serta uptime.',
        responses: {
          '200': jsonResponse('Layanan sehat', {
            type: 'object',
            properties: {
              ok: { type: 'boolean', example: true },
              service: { type: 'string', example: 'awanin-server' },
              version: { type: 'string', example: '1.0.0' },
              uptimeSeconds: { type: 'integer', example: 42 },
              time: { type: 'string', format: 'date-time' },
            },
          }),
          '500': errorResponse('Database tidak dapat dibuka'),
        },
      },
    },
    '/v1/locations': {
      get: {
        tags: ['Kualitas udara'],
        summary: 'Daftar lokasi yang dipantau',
        description:
          'Lima kawasan Jakarta Pusat beserta AQI terakhir yang tercatat oleh scheduler.',
        responses: {
          '200': jsonResponse('Daftar lokasi', {
            type: 'object',
            properties: {
              attribution: { type: 'string' },
              locations: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: '#/components/schemas/Location' },
                    {
                      type: 'object',
                      properties: {
                        aqi: { type: ['integer', 'null'], example: 99 },
                        updatedAt: { type: ['string', 'null'], format: 'date-time' },
                      },
                    },
                  ],
                },
              },
            },
          }),
        },
      },
    },
    '/v1/air': {
      get: {
        tags: ['Kualitas udara'],
        summary: 'Pembacaan AQI untuk koordinat atau slug',
        description:
          'Mengembalikan pembacaan saat ini, 48 titik per jam, dan prakiraan harian. ' +
          'Kalau Open-Meteo gagal, snapshot tersimpan dikirim dengan `stale: true`.',
        parameters: [
          { name: 'lat', in: 'query', description: 'Lintang (-90..90).', schema: { type: 'number' } },
          { name: 'lon', in: 'query', description: 'Bujur (-180..180).', schema: { type: 'number' } },
          { name: 'slug', in: 'query', description: 'Slug lokasi (alternatif koordinat).', schema: { type: 'string' } },
        ],
        responses: {
          '200': jsonResponse('Pembacaan kualitas udara', { $ref: '#/components/schemas/AirResponse' }),
          '400': errorResponse('Koordinat tidak valid atau di luar jangkauan'),
          '404': errorResponse('Slug tidak dikenal'),
          '503': errorResponse('Open-Meteo tidak tersedia dan belum ada snapshot'),
        },
      },
    },
    '/v1/air/{slug}': {
      get: {
        tags: ['Kualitas udara'],
        summary: 'Pembacaan AQI untuk lokasi yang dipantau',
        parameters: [slugParameter],
        responses: {
          '200': jsonResponse('Pembacaan kualitas udara', { $ref: '#/components/schemas/AirResponse' }),
          '404': errorResponse('Slug tidak dikenal'),
          '503': errorResponse('Open-Meteo tidak tersedia dan belum ada snapshot'),
        },
      },
    },
    '/v1/air/{slug}/history': {
      get: {
        tags: ['Kualitas udara'],
        summary: 'Riwayat harian',
        description: 'Agregat rata-rata, maksimum, dan minimum per hari dari seri per jam.',
        parameters: [
          slugParameter,
          {
            name: 'days',
            in: 'query',
            description: 'Jumlah hari ke belakang (1–92, default 7).',
            schema: { type: 'integer', minimum: 1, maximum: 92, default: 7 },
          },
        ],
        responses: {
          '200': jsonResponse('Seri harian', daySeries),
          '404': errorResponse('Slug tidak dikenal'),
        },
      },
    },
    '/v1/air/{slug}/trend': {
      get: {
        tags: ['Kualitas udara'],
        summary: 'Tren pembacaan internal',
        description: 'Poin yang dicatat scheduler untuk slug tersebut (maksimal 168 jam).',
        parameters: [
          slugParameter,
          {
            name: 'hours',
            in: 'query',
            description: 'Jendela waktu dalam jam (1–168, default 24).',
            schema: { type: 'integer', minimum: 1, maximum: 168, default: 24 },
          },
        ],
        responses: {
          '200': jsonResponse('Poin tren', {
            type: 'object',
            properties: {
              slug: { type: 'string' },
              hours: { type: 'integer' },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    aqi: { type: 'integer' },
                    capturedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          }),
        },
      },
    },
    '/v1/devices': {
      post: {
        tags: ['Perangkat'],
        summary: 'Daftarkan perangkat',
        description:
          'Idempoten: memanggil ulang dengan `deviceId` yang sama memperbarui token push ' +
          'alih-alih membuat baris baru. Preferensi default dibuat saat pertama kali.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceId'],
                properties: {
                  deviceId: { type: 'string', example: 'android:5f1c9a0b' },
                  pushToken: { type: ['string', 'null'], example: 'ExponentPushToken[abc123]' },
                  platform: { type: 'string', enum: ['ios', 'android', 'web'] },
                },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse('Perangkat sudah terdaftar', {
            $ref: '#/components/schemas/DeviceResponse',
          }),
          '201': jsonResponse('Perangkat baru dibuat', {
            $ref: '#/components/schemas/DeviceResponse',
          }),
          '400': errorResponse('Validasi gagal atau token push tidak valid'),
        },
      },
    },
    '/v1/devices/{deviceId}': {
      get: {
        tags: ['Perangkat'],
        summary: 'Detail perangkat',
        parameters: [deviceParameter],
        responses: {
          '200': jsonResponse('Perangkat, preferensi, dan notifikasi terakhir', {
            allOf: [
              { $ref: '#/components/schemas/DeviceResponse' },
              {
                type: 'object',
                properties: {
                  notifications: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Notification' },
                  },
                },
              },
            ],
          }),
          '404': errorResponse('Perangkat tidak terdaftar'),
        },
      },
      patch: {
        tags: ['Perangkat'],
        summary: 'Perbarui token push atau preferensi',
        parameters: [deviceParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pushToken: { type: ['string', 'null'] },
                  platform: { type: 'string', enum: ['ios', 'android', 'web'] },
                  preferences: { $ref: '#/components/schemas/Preferences' },
                },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse('Perangkat diperbarui', { $ref: '#/components/schemas/DeviceResponse' }),
          '400': errorResponse('Validasi gagal'),
          '404': errorResponse('Perangkat tidak terdaftar'),
        },
      },
      delete: {
        tags: ['Perangkat'],
        summary: 'Hapus perangkat',
        description: 'Menghapus perangkat beserta preferensi dan riwayat notifikasinya.',
        parameters: [deviceParameter],
        responses: {
          '204': { description: 'Perangkat dihapus' },
          '404': errorResponse('Perangkat tidak terdaftar'),
        },
      },
    },
    '/v1/devices/{deviceId}/notifications': {
      get: {
        tags: ['Perangkat'],
        summary: 'Riwayat notifikasi perangkat',
        parameters: [
          deviceParameter,
          {
            name: 'limit',
            in: 'query',
            description: 'Jumlah maksimum (default 20).',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': jsonResponse('Daftar notifikasi', {
            type: 'object',
            properties: {
              notifications: {
                type: 'array',
                items: { $ref: '#/components/schemas/Notification' },
              },
            },
          }),
          '404': errorResponse('Perangkat tidak terdaftar'),
        },
      },
    },
    '/v1/devices/{deviceId}/test': {
      post: {
        tags: ['Perangkat'],
        summary: 'Kirim notifikasi uji',
        description:
          'Mengirim satu push Expo ke token perangkat dan mencatat hasilnya. ' +
          'Membutuhkan token push yang valid, jadi hanya berfungsi di development build ' +
          'atau build produksi — bukan Expo Go di web.',
        parameters: [deviceParameter],
        responses: {
          '202': jsonResponse('Push diterima Expo', {
            type: 'object',
            properties: {
              accepted: { type: 'integer', example: 1 },
              failed: { type: 'integer', example: 0 },
              errors: { type: 'array', items: { type: 'string' } },
            },
          }),
          '400': errorResponse('Perangkat belum punya token push atau token tidak valid'),
          '404': errorResponse('Perangkat tidak terdaftar'),
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        required: ['error', 'code'],
        properties: {
          error: { type: 'string', example: 'Lokasi "xyz" tidak dikenal' },
          code: { type: 'string', example: 'unknown_location' },
          details: { type: 'object', additionalProperties: true },
        },
      },
      Location: {
        type: 'object',
        required: ['slug', 'name', 'latitude', 'longitude', 'timezone'],
        properties: {
          slug: { type: 'string', example: 'monas' },
          name: { type: 'string', example: 'Monas' },
          area: { type: 'string', example: 'Jakarta Pusat' },
          latitude: { type: 'number', example: -6.179 },
          longitude: { type: 'number', example: 106.8271 },
          timezone: { type: 'string', example: 'Asia/Jakarta' },
        },
      },
      Pollutant: {
        type: 'object',
        properties: {
          key: { type: 'string', example: 'pm2_5' },
          label: { type: 'string', example: 'PM2.5' },
          value: { type: 'number', example: 36.7 },
          unit: { type: 'string', example: 'μg/m³' },
        },
      },
      Reading: {
        type: 'object',
        properties: {
          observedAt: { type: 'string', example: '2026-10-19T14:00' },
          aqi: { type: 'integer', example: 99 },
          pm25: { type: 'number', example: 36.7 },
          pm10: { type: 'number', example: 39.1 },
          temperature: { type: 'number', example: 31.9 },
          humidity: { type: 'number', example: 59 },
          wind: { type: 'number', example: 14.4 },
          weatherCode: { type: 'integer', example: 3 },
          pollutants: { type: 'array', items: { $ref: '#/components/schemas/Pollutant' } },
        },
      },
      DayAqi: {
        type: 'object',
        required: ['day', 'avg', 'max', 'min'],
        properties: {
          day: { type: 'string', example: '2026-10-18' },
          avg: { type: 'number', example: 137.2 },
          max: { type: 'number', example: 162 },
          min: { type: 'number', example: 104 },
        },
      },
      AirResponse: {
        type: 'object',
        required: ['location', 'source', 'reading', 'hourly', 'forecast'],
        properties: {
          location: { $ref: '#/components/schemas/Location' },
          source: { type: 'string', enum: ['open-meteo', 'cache'] },
          stale: { type: 'boolean', example: false },
          cachedAt: { type: 'string', format: 'date-time' },
          fetchedAt: { type: 'integer', example: 1792395817317 },
          reading: { $ref: '#/components/schemas/Reading' },
          hourly: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string', example: '2026-10-19T15:00' },
                aqi: { type: 'number', example: 108 },
              },
            },
          },
          forecast: { type: 'array', items: { $ref: '#/components/schemas/DayAqi' } },
          attribution: { type: 'string' },
        },
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6d1f7f9e-7a6c-4a1e-9b0d-2f5d9c1a3e4b' },
          deviceId: { type: 'string', example: 'android:5f1c9a0b' },
          pushToken: { type: ['string', 'null'], example: 'ExponentPushToken[abc123]' },
          platform: { type: ['string', 'null'], example: 'android' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Preferences: {
        type: 'object',
        properties: {
          locationSlug: { type: 'string', example: 'jakarta-pusat' },
          latitude: { type: ['number', 'null'] },
          longitude: { type: ['number', 'null'] },
          alertsEnabled: { type: 'boolean', example: true },
          dailySummary: { type: 'boolean', example: false },
          tipsEnabled: { type: 'boolean', example: true },
          threshold: { type: 'integer', example: 100 },
          quietStart: { type: ['string', 'null'], example: '22:00' },
          quietEnd: { type: ['string', 'null'], example: '06:00' },
        },
      },
      DeviceResponse: {
        type: 'object',
        properties: {
          created: { type: 'boolean' },
          device: { $ref: '#/components/schemas/Device' },
          preferences: { $ref: '#/components/schemas/Preferences' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          locationSlug: { type: 'string', example: 'monas' },
          aqi: { type: ['integer', 'null'], example: 124 },
          category: { type: ['string', 'null'], example: 'Sedang' },
          title: { type: 'string', example: 'Udara Monas sedang membaik' },
          body: { type: 'string' },
          status: { type: 'string', enum: ['sent', 'failed', 'skipped'] },
          sentAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escapes text and turns `backticked` spans into inline code. */
function richText(value: string): string {
  return escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Minimal server-rendered reference page.
 *
 * No client-side script: helmet's default CSP only allows same-origin scripts,
 * so everything is rendered from the document above.
 */
export function renderDocsHtml(doc: OpenApiDocument = openApiDocument): string {
  const sections = doc.tags
    .map((tag) => {
      const rows = Object.entries(doc.paths)
        .flatMap(([path, operations]) =>
          Object.entries(operations)
            .filter(([, operation]) => operation.tags.includes(tag.name))
            .map(([method, operation]) => renderOperation(path, method, operation)),
        )
        .join('');
      if (!rows) return '';
      return `<section><h2>${escapeHtml(tag.name)}</h2><p class="tag">${richText(
        tag.description,
      )}</p>${rows}</section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.info.title)} — Referensi</title>
<style>
  :root { color-scheme: light; --ink: #15304f; --muted: #596b86; --accent: #1854c8; --line: #dbe6f5; --bg: #f5f9ff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 48px 24px 80px; }
  h1 { font-size: 32px; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 { font-size: 20px; margin: 40px 0 4px; }
  p { margin: 0 0 12px; }
  .lede, .tag { color: var(--muted); }
  .meta { display: flex; gap: 8px; flex-wrap: wrap; margin: 18px 0 8px; }
  .pill { border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 3px 10px; font-size: 12px; color: var(--muted); }
  .op { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; margin: 12px 0; }
  .op-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .method { font: 700 12px/1 ui-monospace, monospace; letter-spacing: 0.04em; border-radius: 6px; padding: 4px 7px; background: #e7f0ff; color: var(--accent); }
  .method.post { background: #e6f6ec; color: #17703f; }
  .method.patch { background: #fdf2df; color: #8a5a12; }
  .method.delete { background: #fdeaea; color: #a33a3a; }
  code, .path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  .path { font-weight: 600; }
  .op p { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-top: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  a { color: var(--accent); }
  footer { margin-top: 48px; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(doc.info.title)}</h1>
  <p class="lede">${escapeHtml(doc.info.description)}</p>
  <div class="meta">
    <span class="pill">OpenAPI ${escapeHtml(doc.openapi)}</span>
    <span class="pill">v${escapeHtml(doc.info.version)}</span>
    <a class="pill" href="/openapi.json">openapi.json</a>
  </div>
  ${sections}
  <footer>Data kualitas udara &amp; cuaca oleh Open-Meteo. Dokumen ini dibuat dari <code>src/openapi.ts</code>.</footer>
</main>
</body>
</html>`;
}

function renderOperation(path: string, method: string, operation: Operation): string {
  const parameters = operation.parameters ?? [];
  const parameterRows = parameters
    .map(
      (parameter) => `<tr>
        <td><code>${escapeHtml(parameter.name)}</code></td>
        <td>${escapeHtml(parameter.in)}</td>
        <td>${richText(parameter.description)}</td>
      </tr>`,
    )
    .join('');
  const responseRows = Object.entries(operation.responses)
    .map(
      ([status, response]) =>
        `<tr><td><code>${escapeHtml(status)}</code></td><td>${escapeHtml(
          response.description,
        )}</td></tr>`,
    )
    .join('');

  return `<article class="op">
    <div class="op-head">
      <span class="method ${escapeHtml(method)}">${escapeHtml(method.toUpperCase())}</span>
      <span class="path">${escapeHtml(path)}</span>
    </div>
    <p>${richText(operation.summary)}${
      operation.description ? ` — ${richText(operation.description)}` : ''
    }</p>
    ${
      parameterRows
        ? `<table><thead><tr><th>Parameter</th><th>Di</th><th>Keterangan</th></tr></thead><tbody>${parameterRows}</tbody></table>`
        : ''
    }
    <table><thead><tr><th>Status</th><th>Respons</th></tr></thead><tbody>${responseRows}</tbody></table>
  </article>`;
}
