/**
 * The cities behind the nationwide "Indonesia" screen.
 *
 * Derived from GeoNames (https://download.geonames.org/export/dump/ID.zip,
 * CC BY 4.0): populated places (feature class P), reduced to every province
 * capital plus the largest cities, skipping places within 20 km of a bigger
 * pick so Jakarta's sprawl does not fill half the list. Province names are
 * translated to Indonesian and a handful of spellings corrected; coordinates
 * are WGS84 rounded to 4 decimals.
 *
 * Open-Meteo accepts all of these coordinates in one request, so the
 * nationwide reading costs a single call (~100 weighted units).
 */
export type IndonesiaCity = {
  /** Stable id, also used as the route slug for the detail screen */
  slug: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  /** IANA zone — Indonesia spans WIB, WITA and WIT */
  timezone: string;
};

export const INDONESIA_CITIES: IndonesiaCity[] = [
  { slug: 'banda-aceh', name: 'Banda Aceh', province: 'Aceh', latitude: 5.5417, longitude: 95.3333, timezone: 'Asia/Jakarta' },
  { slug: 'langsa', name: 'Langsa', province: 'Aceh', latitude: 4.4683, longitude: 97.9683, timezone: 'Asia/Jakarta' },
  { slug: 'lhokseumawe', name: 'Lhokseumawe', province: 'Aceh', latitude: 5.1801, longitude: 97.1507, timezone: 'Asia/Jakarta' },
  { slug: 'denpasar', name: 'Denpasar', province: 'Bali', latitude: -8.65, longitude: 115.2167, timezone: 'Asia/Makassar' },
  { slug: 'cilegon', name: 'Cilegon', province: 'Banten', latitude: -6.0144, longitude: 106.0542, timezone: 'Asia/Jakarta' },
  { slug: 'serang', name: 'Serang', province: 'Banten', latitude: -6.1153, longitude: 106.1542, timezone: 'Asia/Jakarta' },
  { slug: 'tangerang', name: 'Tangerang', province: 'Banten', latitude: -6.1781, longitude: 106.63, timezone: 'Asia/Jakarta' },
  { slug: 'bengkulu', name: 'Bengkulu', province: 'Bengkulu', latitude: -3.8004, longitude: 102.2655, timezone: 'Asia/Jakarta' },
  { slug: 'yogyakarta', name: 'Yogyakarta', province: 'DI Yogyakarta', latitude: -7.8014, longitude: 110.3647, timezone: 'Asia/Jakarta' },
  { slug: 'jakarta', name: 'Jakarta', province: 'DKI Jakarta', latitude: -6.2146, longitude: 106.8451, timezone: 'Asia/Jakarta' },
  { slug: 'gorontalo', name: 'Gorontalo', province: 'Gorontalo', latitude: 0.5375, longitude: 123.0625, timezone: 'Asia/Makassar' },
  { slug: 'jambi', name: 'Jambi', province: 'Jambi', latitude: -1.6, longitude: 103.6167, timezone: 'Asia/Jakarta' },
  { slug: 'bandung', name: 'Bandung', province: 'Jawa Barat', latitude: -6.9222, longitude: 107.6069, timezone: 'Asia/Jakarta' },
  { slug: 'banjar', name: 'Banjar', province: 'Jawa Barat', latitude: -7.1955, longitude: 107.4313, timezone: 'Asia/Jakarta' },
  { slug: 'bekasi', name: 'Bekasi', province: 'Jawa Barat', latitude: -6.2349, longitude: 106.9896, timezone: 'Asia/Jakarta' },
  { slug: 'bogor', name: 'Bogor', province: 'Jawa Barat', latitude: -6.5944, longitude: 106.7892, timezone: 'Asia/Jakarta' },
  { slug: 'cianjur', name: 'Cianjur', province: 'Jawa Barat', latitude: -6.8222, longitude: 107.1394, timezone: 'Asia/Jakarta' },
  { slug: 'cimahi', name: 'Cimahi', province: 'Jawa Barat', latitude: -6.8722, longitude: 107.5425, timezone: 'Asia/Jakarta' },
  { slug: 'cirebon', name: 'Cirebon', province: 'Jawa Barat', latitude: -6.7063, longitude: 108.557, timezone: 'Asia/Jakarta' },
  { slug: 'depok', name: 'Depok', province: 'Jawa Barat', latitude: -6.4, longitude: 106.8186, timezone: 'Asia/Jakarta' },
  { slug: 'karawang', name: 'Karawang', province: 'Jawa Barat', latitude: -6.3052, longitude: 107.3197, timezone: 'Asia/Jakarta' },
  { slug: 'purwakarta', name: 'Purwakarta', province: 'Jawa Barat', latitude: -6.5569, longitude: 107.4433, timezone: 'Asia/Jakarta' },
  { slug: 'subang', name: 'Subang', province: 'Jawa Barat', latitude: -6.57, longitude: 107.7567, timezone: 'Asia/Jakarta' },
  { slug: 'sukabumi', name: 'Sukabumi', province: 'Jawa Barat', latitude: -6.9181, longitude: 106.9267, timezone: 'Asia/Jakarta' },
  { slug: 'sumedang', name: 'Sumedang', province: 'Jawa Barat', latitude: -6.8586, longitude: 107.9164, timezone: 'Asia/Jakarta' },
  { slug: 'tasikmalaya', name: 'Tasikmalaya', province: 'Jawa Barat', latitude: -7.3274, longitude: 108.2207, timezone: 'Asia/Jakarta' },
  { slug: 'cilacap', name: 'Cilacap', province: 'Jawa Tengah', latitude: -7.7264, longitude: 109.0094, timezone: 'Asia/Jakarta' },
  { slug: 'jepara', name: 'Jepara', province: 'Jawa Tengah', latitude: -6.5924, longitude: 110.671, timezone: 'Asia/Jakarta' },
  { slug: 'pekalongan', name: 'Pekalongan', province: 'Jawa Tengah', latitude: -6.8886, longitude: 109.6753, timezone: 'Asia/Jakarta' },
  { slug: 'pemalang', name: 'Pemalang', province: 'Jawa Tengah', latitude: -6.8919, longitude: 109.3826, timezone: 'Asia/Jakarta' },
  { slug: 'purwodadi', name: 'Purwodadi', province: 'Jawa Tengah', latitude: -7.0868, longitude: 110.9158, timezone: 'Asia/Jakarta' },
  { slug: 'purwokerto', name: 'Purwokerto', province: 'Jawa Tengah', latitude: -7.4214, longitude: 109.2344, timezone: 'Asia/Jakarta' },
  { slug: 'salatiga', name: 'Salatiga', province: 'Jawa Tengah', latitude: -7.3319, longitude: 110.4928, timezone: 'Asia/Jakarta' },
  { slug: 'semarang', name: 'Semarang', province: 'Jawa Tengah', latitude: -6.9931, longitude: 110.4208, timezone: 'Asia/Jakarta' },
  { slug: 'surakarta', name: 'Surakarta', province: 'Jawa Tengah', latitude: -7.5561, longitude: 110.8317, timezone: 'Asia/Jakarta' },
  { slug: 'tegal', name: 'Tegal', province: 'Jawa Tengah', latitude: -6.8694, longitude: 109.1402, timezone: 'Asia/Jakarta' },
  { slug: 'blitar', name: 'Blitar', province: 'Jawa Timur', latitude: -8.0983, longitude: 112.1681, timezone: 'Asia/Jakarta' },
  { slug: 'jember', name: 'Jember', province: 'Jawa Timur', latitude: -8.1721, longitude: 113.6995, timezone: 'Asia/Jakarta' },
  { slug: 'kediri', name: 'Kediri', province: 'Jawa Timur', latitude: -7.8167, longitude: 112.0167, timezone: 'Asia/Jakarta' },
  { slug: 'madiun', name: 'Madiun', province: 'Jawa Timur', latitude: -7.6298, longitude: 111.5239, timezone: 'Asia/Jakarta' },
  { slug: 'malang', name: 'Malang', province: 'Jawa Timur', latitude: -7.9797, longitude: 112.6304, timezone: 'Asia/Jakarta' },
  { slug: 'mojokerto', name: 'Mojokerto', province: 'Jawa Timur', latitude: -7.4664, longitude: 112.4338, timezone: 'Asia/Jakarta' },
  { slug: 'pasuruan', name: 'Pasuruan', province: 'Jawa Timur', latitude: -7.6453, longitude: 112.9075, timezone: 'Asia/Jakarta' },
  { slug: 'probolinggo', name: 'Probolinggo', province: 'Jawa Timur', latitude: -7.7543, longitude: 113.2159, timezone: 'Asia/Jakarta' },
  { slug: 'sidoarjo', name: 'Sidoarjo', province: 'Jawa Timur', latitude: -7.4478, longitude: 112.7183, timezone: 'Asia/Jakarta' },
  { slug: 'situbondo', name: 'Situbondo', province: 'Jawa Timur', latitude: -7.7062, longitude: 114.0098, timezone: 'Asia/Jakarta' },
  { slug: 'surabaya', name: 'Surabaya', province: 'Jawa Timur', latitude: -7.2492, longitude: 112.7508, timezone: 'Asia/Jakarta' },
  { slug: 'pontianak', name: 'Pontianak', province: 'Kalimantan Barat', latitude: -0.0319, longitude: 109.325, timezone: 'Asia/Pontianak' },
  { slug: 'singkawang', name: 'Singkawang', province: 'Kalimantan Barat', latitude: 0.9093, longitude: 108.9846, timezone: 'Asia/Pontianak' },
  { slug: 'banjarbaru', name: 'Banjarbaru', province: 'Kalimantan Selatan', latitude: -3.4406, longitude: 114.8365, timezone: 'Asia/Makassar' },
  { slug: 'banjarmasin', name: 'Banjarmasin', province: 'Kalimantan Selatan', latitude: -3.3199, longitude: 114.5908, timezone: 'Asia/Makassar' },
  { slug: 'palangka-raya', name: 'Palangka Raya', province: 'Kalimantan Tengah', latitude: -2.2083, longitude: 113.9167, timezone: 'Asia/Pontianak' },
  { slug: 'sampit', name: 'Sampit', province: 'Kalimantan Tengah', latitude: -2.5315, longitude: 112.9496, timezone: 'Asia/Pontianak' },
  { slug: 'balikpapan', name: 'Balikpapan', province: 'Kalimantan Timur', latitude: -1.2675, longitude: 116.8289, timezone: 'Asia/Makassar' },
  { slug: 'bontang', name: 'Bontang', province: 'Kalimantan Timur', latitude: 0.1324, longitude: 117.4854, timezone: 'Asia/Makassar' },
  { slug: 'nusantara', name: 'Nusantara', province: 'Kalimantan Timur', latitude: -0.9731, longitude: 116.7086, timezone: 'Asia/Makassar' },
  { slug: 'samarinda', name: 'Samarinda', province: 'Kalimantan Timur', latitude: -0.4917, longitude: 117.1458, timezone: 'Asia/Makassar' },
  { slug: 'tanjung-selor', name: 'Tanjung Selor', province: 'Kalimantan Utara', latitude: 2.8375, longitude: 117.3653, timezone: 'Asia/Makassar' },
  { slug: 'tarakan', name: 'Tarakan', province: 'Kalimantan Utara', latitude: 3.3133, longitude: 117.5915, timezone: 'Asia/Makassar' },
  { slug: 'pangkalpinang', name: 'Pangkalpinang', province: 'Kepulauan Bangka Belitung', latitude: -2.1291, longitude: 106.1138, timezone: 'Asia/Jakarta' },
  { slug: 'tanjung-pinang', name: 'Tanjung Pinang', province: 'Kepulauan Riau', latitude: 0.9167, longitude: 104.4583, timezone: 'Asia/Jakarta' },
  { slug: 'bandar-lampung', name: 'Bandar Lampung', province: 'Lampung', latitude: -5.4292, longitude: 105.2611, timezone: 'Asia/Jakarta' },
  { slug: 'metro', name: 'Metro', province: 'Lampung', latitude: -5.1131, longitude: 105.3067, timezone: 'Asia/Jakarta' },
  { slug: 'ambon', name: 'Ambon', province: 'Maluku', latitude: -3.6958, longitude: 128.1833, timezone: 'Asia/Jayapura' },
  { slug: 'ternate', name: 'Ternate', province: 'Maluku Utara', latitude: 0.7907, longitude: 127.3842, timezone: 'Asia/Jayapura' },
  { slug: 'bima', name: 'Bima', province: 'Nusa Tenggara Barat', latitude: -8.4601, longitude: 118.7267, timezone: 'Asia/Makassar' },
  { slug: 'mataram', name: 'Mataram', province: 'Nusa Tenggara Barat', latitude: -8.5833, longitude: 116.1167, timezone: 'Asia/Makassar' },
  { slug: 'kupang', name: 'Kupang', province: 'Nusa Tenggara Timur', latitude: -10.1708, longitude: 123.6069, timezone: 'Asia/Makassar' },
  { slug: 'labuan-bajo', name: 'Labuan Bajo', province: 'Nusa Tenggara Timur', latitude: -8.4964, longitude: 119.8877, timezone: 'Asia/Makassar' },
  { slug: 'jayapura', name: 'Jayapura', province: 'Papua', latitude: -2.5337, longitude: 140.7181, timezone: 'Asia/Jayapura' },
  { slug: 'manokwari', name: 'Manokwari', province: 'Papua Barat', latitude: -0.8629, longitude: 134.064, timezone: 'Asia/Jayapura' },
  { slug: 'sorong', name: 'Sorong', province: 'Papua Barat Daya', latitude: -0.8796, longitude: 131.261, timezone: 'Asia/Jayapura' },
  { slug: 'wamena', name: 'Wamena', province: 'Papua Pegunungan', latitude: -4.0958, longitude: 138.9481, timezone: 'Asia/Jayapura' },
  { slug: 'merauke', name: 'Merauke', province: 'Papua Selatan', latitude: -8.4996, longitude: 140.4061, timezone: 'Asia/Jayapura' },
  { slug: 'nabire', name: 'Nabire', province: 'Papua Tengah', latitude: -3.3599, longitude: 135.5007, timezone: 'Asia/Jayapura' },
  { slug: 'timika', name: 'Timika', province: 'Papua Tengah', latitude: -4.6141, longitude: 136.6768, timezone: 'Asia/Jayapura' },
  { slug: 'batam', name: 'Batam', province: 'Riau', latitude: 1.1494, longitude: 104.0249, timezone: 'Asia/Jakarta' },
  { slug: 'dumai', name: 'Dumai', province: 'Riau', latitude: 1.6671, longitude: 101.4432, timezone: 'Asia/Jakarta' },
  { slug: 'pekanbaru', name: 'Pekanbaru', province: 'Riau', latitude: 0.5167, longitude: 101.4417, timezone: 'Asia/Jakarta' },
  { slug: 'majene', name: 'Majene', province: 'Sulawesi Barat', latitude: -3.5403, longitude: 118.9707, timezone: 'Asia/Makassar' },
  { slug: 'makassar', name: 'Makassar', province: 'Sulawesi Selatan', latitude: -5.1486, longitude: 119.4319, timezone: 'Asia/Makassar' },
  { slug: 'palopo', name: 'Palopo', province: 'Sulawesi Selatan', latitude: -2.9925, longitude: 120.1969, timezone: 'Asia/Makassar' },
  { slug: 'parepare', name: 'Parepare', province: 'Sulawesi Selatan', latitude: -4.0135, longitude: 119.6255, timezone: 'Asia/Makassar' },
  { slug: 'watampone', name: 'Watampone', province: 'Sulawesi Selatan', latitude: -4.5386, longitude: 120.3279, timezone: 'Asia/Makassar' },
  { slug: 'palu', name: 'Palu', province: 'Sulawesi Tengah', latitude: -0.9083, longitude: 119.8708, timezone: 'Asia/Makassar' },
  { slug: 'tolitoli', name: 'Tolitoli', province: 'Sulawesi Tengah', latitude: 1.0402, longitude: 120.8176, timezone: 'Asia/Makassar' },
  { slug: 'baubau', name: 'Baubau', province: 'Sulawesi Tenggara', latitude: -5.4633, longitude: 122.6024, timezone: 'Asia/Makassar' },
  { slug: 'kendari', name: 'Kendari', province: 'Sulawesi Tenggara', latitude: -3.9778, longitude: 122.5151, timezone: 'Asia/Makassar' },
  { slug: 'bitung', name: 'Bitung', province: 'Sulawesi Utara', latitude: 1.4406, longitude: 125.1282, timezone: 'Asia/Makassar' },
  { slug: 'manado', name: 'Manado', province: 'Sulawesi Utara', latitude: 1.4822, longitude: 124.8489, timezone: 'Asia/Makassar' },
  { slug: 'padang', name: 'Padang', province: 'Sumatera Barat', latitude: -0.9492, longitude: 100.3543, timezone: 'Asia/Jakarta' },
  { slug: 'payakumbuh', name: 'Payakumbuh', province: 'Sumatera Barat', latitude: -0.2159, longitude: 100.6334, timezone: 'Asia/Jakarta' },
  { slug: 'lubuklinggau', name: 'Lubuklinggau', province: 'Sumatera Selatan', latitude: -3.2945, longitude: 102.8614, timezone: 'Asia/Jakarta' },
  { slug: 'palembang', name: 'Palembang', province: 'Sumatera Selatan', latitude: -2.9167, longitude: 104.7458, timezone: 'Asia/Jakarta' },
  { slug: 'binjai', name: 'Binjai', province: 'Sumatera Utara', latitude: 3.6001, longitude: 98.4854, timezone: 'Asia/Jakarta' },
  { slug: 'kisaran', name: 'Kisaran', province: 'Sumatera Utara', latitude: 2.9845, longitude: 99.6158, timezone: 'Asia/Jakarta' },
  { slug: 'medan', name: 'Medan', province: 'Sumatera Utara', latitude: 3.5833, longitude: 98.6667, timezone: 'Asia/Jakarta' },
  { slug: 'padangsidimpuan', name: 'Padangsidimpuan', province: 'Sumatera Utara', latitude: 1.3795, longitude: 99.2715, timezone: 'Asia/Jakarta' },
  { slug: 'pematangsiantar', name: 'Pematangsiantar', province: 'Sumatera Utara', latitude: 2.9595, longitude: 99.0687, timezone: 'Asia/Jakarta' },
  { slug: 'tanjungbalai', name: 'Tanjungbalai', province: 'Sumatera Utara', latitude: 2.9667, longitude: 99.8, timezone: 'Asia/Jakarta' },
];
