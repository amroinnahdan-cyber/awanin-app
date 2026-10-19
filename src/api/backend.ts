import { Platform } from 'react-native';

import type {
  CurrentReading,
  DayAqi,
  HourlyForecastPoint,
} from '@/api/openMeteo';

/**
 * Base URL of `awanin-server`.
 *
 * Set `EXPO_PUBLIC_API_URL` when starting Expo (in `.env.local`, a shell
 * variable, or the EAS environment). Expo inlines `EXPO_PUBLIC_*` at bundle
 * time, so no runtime config or secret is involved. Empty means "direct mode":
 * every call goes straight to Open-Meteo and push registration is skipped.
 */
export const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export function backendConfigured(): boolean {
  return BACKEND_URL.length > 0;
}

export class BackendError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'backend_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 7_000,
): Promise<T> {
  if (!backendConfigured()) {
    throw new BackendError(0, 'Backend belum dikonfigurasi', 'not_configured');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      const body = payload as { error?: string; code?: string } | null;
      throw new BackendError(
        response.status,
        body?.error ?? `Backend ${response.status}`,
        body?.code ?? 'backend_error',
      );
    }
    return payload as T;
  } catch (error) {
    if (error instanceof BackendError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BackendError(0, 'Backend tidak merespons', 'timeout');
    }
    throw new BackendError(0, error instanceof Error ? error.message : 'Koneksi gagal');
  } finally {
    clearTimeout(timer);
  }
}

type BackendAirResponse = {
  location: { slug: string; name: string };
  source: 'open-meteo' | 'cache';
  stale: boolean;
  cachedAt?: string;
  reading: {
    observedAt: string;
    aqi: number;
    pm25: number;
    pm10: number;
    temperature: number;
    humidity: number;
    wind: number;
    weatherCode: number;
    pollutants: CurrentReading['pollutants'];
  };
  hourly: HourlyForecastPoint[];
  forecast: DayAqi[];
};

export type AirResult = {
  reading: CurrentReading;
  hourly: HourlyForecastPoint[];
  forecast: DayAqi[];
};

export async function fetchAirFromBackend(
  latitude: number,
  longitude: number,
): Promise<AirResult> {
  const payload = await request<BackendAirResponse>(
    `/v1/air?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
  );
  return {
    reading: {
      ...payload.reading,
      source: 'backend',
      stale: payload.stale,
      cachedAt: payload.cachedAt,
    },
    hourly: payload.hourly ?? [],
    forecast: payload.forecast ?? [],
  };
}

export async function fetchHistoryFromBackend(
  slug: string,
  days: number,
): Promise<DayAqi[]> {
  const payload = await request<{ series: DayAqi[] }>(
    `/v1/air/${encodeURIComponent(slug)}/history?days=${days}`,
  );
  return payload.series ?? [];
}

export type DeviceRegistration = {
  created: boolean;
  device: {
    deviceId: string;
    pushToken: string | null;
    platform: string | null;
  };
  preferences: {
    locationSlug: string;
    alertsEnabled: boolean;
    dailySummary: boolean;
    tipsEnabled: boolean;
    threshold: number;
  };
};

export async function registerDevice(input: {
  deviceId: string;
  pushToken?: string | null;
  platform?: string;
}): Promise<DeviceRegistration> {
  return request<DeviceRegistration>('/v1/devices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function patchDevice(
  deviceId: string,
  input: {
    pushToken?: string | null;
    platform?: string;
    preferences?: {
      locationSlug?: string;
      latitude?: number | null;
      longitude?: number | null;
      alertsEnabled?: boolean;
      dailySummary?: boolean;
      tipsEnabled?: boolean;
      threshold?: number;
    };
  },
): Promise<DeviceRegistration> {
  return request<DeviceRegistration>(`/v1/devices/${encodeURIComponent(deviceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await request<null>(`/v1/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
}

export async function sendTestPush(deviceId: string): Promise<{
  accepted: number;
  failed: number;
  errors: string[];
}> {
  return request(`/v1/devices/${encodeURIComponent(deviceId)}/test`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export type RemoteNotification = {
  id: string;
  locationSlug: string;
  aqi: number | null;
  category: string | null;
  title: string;
  body: string;
  status: string;
  sentAt: string;
};

export async function fetchRemoteNotifications(
  deviceId: string,
): Promise<RemoteNotification[]> {
  const payload = await request<{ notifications: RemoteNotification[] }>(
    `/v1/devices/${encodeURIComponent(deviceId)}/notifications?limit=20`,
  );
  return payload.notifications ?? [];
}

export function platformForBackend(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}
