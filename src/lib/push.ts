import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * `expo-notifications` resolves a native module (`ExpoTopicSubscriptionModule`,
 * among others) at import time. On runtimes that ship a mismatched binary — for
 * example Expo Go 58.0.4 while the package is 58.1.5 — that import throws
 * "Cannot find native module", and because it happened at module-load the whole
 * app crashed before the first frame.
 *
 * Loading the module lazily keeps that failure contained: the app boots, and
 * push simply reports itself unavailable with a readable reason instead of a
 * blank screen. The result is cached so we only pay the require once.
 */
let cachedModule: NotificationsModule | null = null;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

const UNAVAILABLE =
  'Notifikasi native tidak tersedia di runtime ini (modul push tidak ditemukan).';

/**
 * Local presentation while the app is open. Applied lazily so a missing native
 * module never blocks startup. Expo SDK 54 replaced `shouldShowAlert` with the
 * banner/list pair; both are set for forward compatibility across SDKs.
 */
let handlerInstalled = false;
function installNotificationHandler(notifications: NotificationsModule): void {
  if (handlerInstalled) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerInstalled = true;
}

export type PushRegistration = {
  token: string | null;
  supported: boolean;
  reason: string | null;
};

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const easConfig = (Constants as unknown as { easConfig?: { projectId?: string } })
    .easConfig;
  return extra?.eas?.projectId ?? easConfig?.projectId ?? null;
}

/**
 * Request permission and obtain an Expo push token.
 *
 * Expo Go does not support remote push (SDK 53+ removed it on Android), and a
 * token also needs an EAS project id. Every failure is returned as a readable
 * reason so the UI can explain the limitation instead of showing a dead switch.
 */
export async function registerForPush(): Promise<PushRegistration> {
  if (Platform.OS === 'web') {
    return {
      token: null,
      supported: false,
      reason: 'Push jarak jauh belum didukung di web. Notifikasi dalam aplikasi tetap aktif.',
    };
  }

  const notifications = loadNotifications();
  if (!notifications) {
    return { token: null, supported: false, reason: UNAVAILABLE };
  }

  if (!Device.isDevice) {
    return {
      token: null,
      supported: false,
      reason: 'Push membutuhkan perangkat fisik, bukan emulator.',
    };
  }

  try {
    installNotificationHandler(notifications);
    const existing = await notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      return {
        token: null,
        supported: false,
        reason: 'Izin notifikasi ditolak. Aktifkan lewat pengaturan perangkat.',
      };
    }

    if (Platform.OS === 'android') {
      const importance = notifications.AndroidImportance?.HIGH ?? 3;
      await notifications.setNotificationChannelAsync('air-quality', {
        name: 'Kualitas udara',
        importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1854c8',
      });
    }

    const id = projectId();
    if (!id) {
      return {
        token: null,
        supported: false,
        reason:
          'Project ID EAS belum diatur. Push jarak jauh butuh development build dengan projectId.',
      };
    }

    const { data } = await notifications.getExpoPushTokenAsync({ projectId: id });
    return { token: data, supported: true, reason: null };
  } catch (error) {
    return {
      token: null,
      supported: false,
      reason:
        error instanceof Error
          ? `Push belum bisa didaftarkan: ${error.message}`
          : 'Push belum bisa didaftarkan di perangkat ini.',
    };
  }
}

/** Routes a tapped notification to the location it is about. */
export function attachNotificationNavigation(
  onOpen: (slug: string) => void,
): () => void {
  const notifications = loadNotifications();
  if (!notifications) return () => {};
  installNotificationHandler(notifications);

  const subscription = notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as
        | { slug?: unknown }
        | undefined;
      if (data && typeof data.slug === 'string') onOpen(data.slug);
    },
  );
  return () => subscription.remove();
}
