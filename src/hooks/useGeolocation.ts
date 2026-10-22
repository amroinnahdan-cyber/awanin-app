import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

import { selectCustomLocation } from '@/state/app';

export type GeolocationState = {
  locating: boolean;
  error: string | null;
  /** Resolves true when a fix was read and applied to app state. */
  locate: () => Promise<boolean>;
};

/**
 * Reads the device's real position and turns it into the app's selected
 * location (`lokasi-saya`), so every screen follows it without a parallel code
 * path. Shared by the location sheet and the map's locate button.
 *
 * Every failure mode becomes readable copy instead of an unhandled rejection:
 * denied permission, no GPS in an emulator, or a browser without geolocation.
 * Reverse geocoding needs the network, so it degrades to "Lokasi saya".
 */
export function useGeolocation(): GeolocationState {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Izin lokasi ditolak. Aktifkan lewat pengaturan perangkat.');
        return false;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      let name = 'Lokasi saya';
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        name = place?.district ?? place?.subregion ?? place?.city ?? name;
      } catch {
        // Reverse geocoding needs a network; the coordinates are still valid.
      }

      selectCustomLocation(name, latitude, longitude);
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Gagal membaca lokasi perangkat.',
      );
      return false;
    } finally {
      setLocating(false);
    }
  }, []);

  return { locating, error, locate };
}
