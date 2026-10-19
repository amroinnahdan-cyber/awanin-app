import {
  backendConfigured,
  deleteDevice,
  patchDevice,
  platformForBackend,
  registerDevice,
  sendTestPush,
  type DeviceRegistration,
} from '@/api/backend';
import { getDeviceId } from '@/lib/device';
import { registerForPush } from '@/lib/push';
import { getPushState, setPushState, type PushState } from '@/state/push';
import type { AppLocation, AppSettings } from '@/state/app';

/**
 * Mirrors the app's notification settings into `awanin-server`.
 *
 * The server owns the scheduling (it keeps running when the app is closed), so
 * this is the only place the two sides have to agree. It is safe to call often:
 * device registration is idempotent and preferences are a PATCH.
 */
export async function syncPushSubscription(
  selected: AppLocation,
  settings: AppSettings,
): Promise<PushState> {
  if (!backendConfigured()) {
    setPushState({
      status: 'unsupported',
      message: 'Backend belum dikonfigurasi (EXPO_PUBLIC_API_URL).',
    });
    return getPushState();
  }

  const deviceId = await getDeviceId();
  setPushState({ status: 'syncing', message: 'Menyinkronkan dengan server…', deviceId });

  try {
    const registration = settings.notifMaster
      ? await registerForPush()
      : { token: null, supported: false, reason: null };

    const device: DeviceRegistration = await registerDevice({
      deviceId,
      pushToken: registration.token,
      platform: platformForBackend(),
    });

    await patchDevice(deviceId, {
      preferences: {
        locationSlug: selected.slug,
        latitude: selected.location.latitude,
        longitude: selected.location.longitude,
        alertsEnabled: settings.notifMaster && settings.badAirAlerts,
        dailySummary: settings.notifMaster && settings.weatherUpdate,
        tipsEnabled: settings.tipsHealth,
        threshold: 100,
      },
    });

    if (registration.token) {
      setPushState({
        status: 'connected',
        message: 'Server akan mengirim peringatan walau aplikasi ditutup.',
        token: registration.token,
        deviceId: device.device.deviceId,
        lastSyncedAt: new Date().toISOString(),
      });
    } else {
      setPushState({
        status: 'unsupported',
        message:
          registration.reason ??
          (settings.notifMaster
            ? 'Token push belum tersedia.'
            : 'Notifikasi dimatikan; preferensi tetap tersimpan di server.'),
        token: null,
        deviceId: device.device.deviceId,
        lastSyncedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    setPushState({
      status: 'error',
      message:
        error instanceof Error
          ? `Gagal sinkron dengan server: ${error.message}`
          : 'Gagal sinkron dengan server.',
      deviceId,
    });
  }

  return getPushState();
}

export async function sendTestNotification(): Promise<{
  accepted: number;
  failed: number;
  errors: string[];
}> {
  const deviceId = await getDeviceId();
  return sendTestPush(deviceId);
}

/** "Keluar" also unsubscribes the device, so no alerts arrive after a reset. */
export async function removeSubscription(): Promise<void> {
  if (!backendConfigured()) return;
  try {
    const deviceId = await getDeviceId();
    await deleteDevice(deviceId);
  } catch {
    // Best effort: a missing row or offline device must not block the reset.
  }
}
