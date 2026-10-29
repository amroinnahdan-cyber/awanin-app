import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

import { selectCustomLocation, shouldFollowDevice } from '@/state/app';

/**
 * `getCurrentPositionAsync` has no timeout option of its own — its docs only
 * warn that resolving "may take several seconds" — so with no provider fix it
 * stays pending forever and the button spins without ever saying why. This is
 * the deadline after which we fall back to the last known position. The same
 * stall happens to `reverseGeocodeAsync` on emulators with no network backing
 * the geocoder, so naming gets its own (shorter) deadline below.
 */
const FIX_TIMEOUT_MS = 12_000;

/** Naming the fix must never block applying it: coordinates are the payload. */
const REVERSE_GEOCODE_TIMEOUT_MS = 5_000;

/** A cached fix older than this is too old to present as "lokasi terkini". */
const LAST_KNOWN_MAX_AGE_MS = 15 * 60_000;

const TIMEOUT_MESSAGE =
  'Belum ada sinyal lokasi dalam 12 detik. Aktifkan layanan lokasi perangkat, lalu coba lagi.';
const DENIED_MESSAGE = 'Izin lokasi ditolak. Aktifkan lewat pengaturan perangkat.';
const DENIED_PERMANENT_MESSAGE =
  'Izin lokasi sudah ditolak sebelumnya, jadi tidak ada pemberitahuan lagi. Aktifkan lewat pengaturan perangkat.';
const SERVICES_OFF_MESSAGE =
  'Layanan lokasi perangkat sedang mati. Nyalakan lewat Pengaturan → Lokasi, lalu coba lagi.';
const WEB_DENIED_MESSAGE =
  'Izin lokasi ditolak browser. Ketuk ikon gembok di bilah alamat untuk mengizinkan Lokasi, lalu coba lagi.';

export type GeolocationState = {
  locating: boolean;
  error: string | null;
  /**
   * True only when the OS will not prompt again, so the UI can offer a way out
   * instead of a sentence the user cannot act on.
   */
  needsSettings: boolean;
  /** Opens this app's page in system settings; a no-op on web. */
  openSettings: () => void;
  /** Resolves true when a fix was read and applied to app state. */
  locate: () => Promise<boolean>;
  /**
   * One quiet read meant for app start: when permission is already granted and
   * the user never picked a place by hand, the stored fix (or a fresh one) is
   * applied so the home screen opens on the device instead of Jakarta Pusat.
   * Never prompts, never surfaces errors — returns false when there is
   * nothing to apply, so the home screen simply keeps its current place.
   */
  locateSilently: () => Promise<boolean>;
};

/** Rejected when a fix takes longer than `FIX_TIMEOUT_MS`. */
class FixTimeoutError extends Error {}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new FixTimeoutError()), ms);
    // Attaching handlers here also covers the abandoned promise: when the
    // deadline wins, its later rejection must not escape as unhandled.
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function messageFor(caught: unknown): string {
  if (caught instanceof FixTimeoutError) return TIMEOUT_MESSAGE;
  const raw = caught instanceof Error ? caught.message : '';
  // Android surfaces provider problems as plain English/technical strings; they
  // are the one case where retrying without touching settings cannot help.
  if (/location service|location disabled|provider.*disabled|position unavailable/i.test(raw)) {
    return SERVICES_OFF_MESSAGE;
  }
  return raw || 'Gagal membaca lokasi perangkat.';
}

/**
 * Reads the device's real position and turns it into the app's selected
 * location (`lokasi-saya`), so every screen follows it without a parallel code
 * path. Shared by the location sheet and the Sekitar screen's locate button.
 *
 * Every failure mode becomes readable copy instead of an unhandled rejection:
 * denied permission (with a settings shortcut once the OS stops asking), a fix
 * that never arrives, location services switched off, or a browser without
 * geolocation. Reverse geocoding needs the network, so it degrades to
 * "Lokasi saya".
 */
export function useGeolocation(): GeolocationState {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'web') return;
    // The only reliable exit once `canAskAgain` is false. A device without a
    // settings page for the app must not throw out of a tap handler.
    void Linking.openSettings().catch(() => {});
  }, []);

  const locate = useCallback(async (): Promise<boolean> => {
    setError(null);
    setNeedsSettings(false);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        if (Platform.OS === 'web') {
          setError(WEB_DENIED_MESSAGE);
        } else if (permission.canAskAgain) {
          setError(DENIED_MESSAGE);
        } else {
          // The system will never prompt again: an "allow" instruction would
          // be a dead end, so this is the one branch that offers a button.
          setError(DENIED_PERMANENT_MESSAGE);
          setNeedsSettings(true);
        }
        return false;
      }

      let position: Location.LocationObject | null;
      try {
        position = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          FIX_TIMEOUT_MS,
        );
      } catch (caught) {
        // A real provider error is reported as-is; a stall falls back to the
        // last fix, which is what makes a slow emulator usable at all.
        if (!(caught instanceof FixTimeoutError)) throw caught;
        position = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
        });
        if (!position) throw new FixTimeoutError();
      }

      const { latitude, longitude } = position.coords;

      let name = 'Lokasi saya';
      try {
        const [place] = await withTimeout(
          Location.reverseGeocodeAsync({ latitude, longitude }),
          REVERSE_GEOCODE_TIMEOUT_MS,
        );
        name = place?.district ?? place?.subregion ?? place?.city ?? name;
      } catch {
        // Reverse geocoding needs a network; the coordinates are still valid.
        // A stall resolves with the fallback name instead of hanging the sheet.
      }

      selectCustomLocation(name, latitude, longitude);
      return true;
    } catch (caught) {
      setError(messageFor(caught));
      return false;
    } finally {
      setLocating(false);
    }
  }, []);

  /**
   * Startup companion to `locate`: restores a saved device pin first (no GPS,
   * no prompt), then tries a quiet fresh read when permission already exists.
   * The state layer decides whether the fix also moves the active screen, so
   * an explicit Jakarta Pusat pick is never clobbered behind the user's back.
   */
  const locateSilently = useCallback(async (): Promise<boolean> => {
    if (!shouldFollowDevice()) return false;
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') return false;
      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        FIX_TIMEOUT_MS,
      ).catch(() =>
        Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }),
      );
      if (!position) return false;
      const { latitude, longitude } = position.coords;
      let name = 'Lokasi saya';
      try {
        const [place] = await withTimeout(
          Location.reverseGeocodeAsync({ latitude, longitude }),
          REVERSE_GEOCODE_TIMEOUT_MS,
        );
        name = place?.district ?? place?.subregion ?? place?.city ?? name;
      } catch {
        // Same degradation as `locate`: coordinates win over the label.
      }
      selectCustomLocation(name, latitude, longitude);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { locating, error, needsSettings, openSettings, locate, locateSilently };
}
