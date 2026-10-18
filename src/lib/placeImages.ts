/**
 * Photographic tiles/hero images for the showcase locations. Keys match the
 * slugs from `locationSlug()` / `ALL_LOCATIONS`.
 */
export const PLACE_IMAGES: Record<string, number> = {
  'monas': require('../../assets/img-monas.jpg'),
  'bundaran-hi': require('../../assets/img-bundaran-hi.jpg'),
  'gbk': require('../../assets/img-gbk.jpg'),
  'kota-tua': require('../../assets/img-kota-tua.jpg'),
};

export function placeImage(slug: string): number | null {
  return PLACE_IMAGES[slug] ?? null;
}
