import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Expo Go on Android does not ship `ExpoTopicSubscriptionModule` (remote push was
 * removed from Expo Go in SDK 53), yet `expo-notifications` resolves that native
 * module while its own index is being evaluated. That makes a plain
 * `import 'expo-notifications'` — and even a `require` wrapped in `try/catch` —
 * fatal: Metro loads modules through `guardedLoadModule`, which reports the
 * failure with `ErrorUtils.reportFatalError` and never rethrows, so the `catch`
 * block is skipped and the red error screen appears anyway.
 *
 * The only reliable fix is to never touch the package when the native module is
 * known to be absent. Everything else (web, iOS Expo Go, dev builds, release
 * builds) keeps the previous behaviour: the module is loaded lazily, and a
 * mismatched binary still degrades to "push unavailable" instead of a crash.
 */
let expoGoAndroid: boolean | null = null;

function isExpoGoOnAndroid(): boolean {
  if (expoGoAndroid !== null) return expoGoAndroid;
  try {
    expoGoAndroid = Platform.OS === 'android' && isRunningInExpoGo();
  } catch {
    expoGoAndroid = false;
  }
  return expoGoAndroid;
}

let cachedModule: NotificationsModule | null = null;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule) return cachedModule;
  if (isExpoGoOnAndroid()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = (require('expo-notifications') as NotificationsModule) ?? null;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

const EXPO_GO_REASON =
  'Push jarak jauh tidak tersedia di Expo Go pada Android (dihapus sejak SDK 53). Notifikasi di dalam aplikasi tetap berjalan; pakai development build untuk push.';

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

/**
 * Remote (server) push is switched OFF for now.
 *
 * Registering a token needs an FCM-capable build; that requires Google
 * Services config (`google-services.json` dropped at the project root —
 * `app.json` already points `android.googleServicesFile` at it) plus the FCM
 * V1 credential uploaded to EAS. Until both exist, `getExpoPushTokenAsync`
 * throws "Default FirebaseApp is not initialized" on Android and the app used
 * to surface that scary raw Firebase message.
 *
 * While this flag is false, registration short-circuits before any native
 * call: the onboarding and settings screens show a calm sentence instead, and
 * in-app notifications keep working. Flip it to `true` once the Firebase
 * project reaches apps/awanin; the deep paths below are untouched and fully
 * wired for when it is turned on again (set `remotePushEnabled = true`).
 */
let remotePushEnabled = false;

/** Test hook: opt back into the real registration paths below the flag. */
export function setRemotePushEnabled(value: boolean): void {
  remotePushEnabled = value;
}

const DISABLED_REASON =
  'Push jarak jauh dimatikan sementara. Pengingat di dalam aplikasi tetap berjalan.';

/**
 * Local (on-device) notifications. They need no Firebase, no token, and no
 * server: the OS shows them while the app is running, which is what the feed in
 * `state/notifications` produces (daily digest, category change, health tip).
 *
 * Deliberately separate from the remote path above: these keep working even
 * while `remotePushEnabled` is false, and every failure is swallowed so a
 * runtime without the native module never breaks a reading.
 */
const AIR_QUALITY_CHANNEL = 'air-quality';

type LocalNotification = {
  title: string;
  body: string;
  /** Route slug of the location the notification is about */
  slug: string;
};

async function ensureAirQualityChannel(notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  const importance = notifications.AndroidImportance?.HIGH ?? 3;
  await notifications.setNotificationChannelAsync(AIR_QUALITY_CHANNEL, {
    name: 'Kualitas udara',
    importance,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1854c8',
  });
}

/**
 * Ask for notification permission, once, when the user turns notifications on.
 * Returns whether notifications may be shown; a denied or unavailable runtime is
 * reported as `false` rather than thrown.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const notifications = loadNotifications();
  if (!notifications) return false;
  try {
    installNotificationHandler(notifications);
    await ensureAirQualityChannel(notifications);
    const existing = await notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Present a local notification immediately (no scheduling, no server).
 *
 * Silently does nothing when the native module is missing or permission was
 * declined — the in-app feed has already recorded the entry, so the user still
 * sees it when opening the app.
 */
export async function presentLocalNotification(entry: LocalNotification): Promise<void> {
  const notifications = loadNotifications();
  if (!notifications) return;
  try {
    installNotificationHandler(notifications);
    await ensureAirQualityChannel(notifications);
    const permission = await notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;
    await notifications.scheduleNotificationAsync({
      content: {
        title: entry.title,
        body: entry.body,
        sound: 'default',
        data: { slug: entry.slug },
      },
      trigger: null,
    });
  } catch {
    // A notification must never take down the reading that produced it.
  }
}

/**
 * A notification the OS delivers on its own at a fixed moment.
 *
 * The copy is composed by `lib/reminders` so this file stays about the native
 * call: title/body are final strings, `at` is an absolute epoch in ms.
 */
export type ReminderEntry = {
  /** Local `YYYY-MM-DD`, also used to make the identifier idempotent */
  date: string;
  at: number;
  title: string;
  body: string;
  slug: string;
};

/** Only reminders carry this prefix, so cancelling never touches other alerts. */
export const REMINDER_ID_PREFIX = 'awanin-morning-';

async function cancelQueuedReminders(notifications: NotificationsModule): Promise<void> {
  const queued = await notifications.getAllScheduledNotificationsAsync();
  for (const request of queued) {
    const identifier = request.identifier ?? '';
    if (identifier.startsWith(REMINDER_ID_PREFIX)) {
      await notifications.cancelScheduledNotificationAsync(identifier);
    }
  }
}

export async function cancelMorningReminders(): Promise<void> {
  const notifications = loadNotifications();
  if (!notifications) return;
  try {
    await cancelQueuedReminders(notifications);
  } catch {
    // A runtime without scheduling support simply has nothing queued.
  }
}

/**
 * Queue one dated notification per forecast day, replacing the previous queue.
 *
 * Uses a `DATE` trigger so Android delivers it with the app closed; the channel
 * keeps it grouped with the other air-quality alerts. Returns how many were
 * actually queued (0 when the module, permission, or platform is missing).
 */
export async function scheduleMorningReminders(entries: ReminderEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const notifications = loadNotifications();
  if (!notifications) return 0;
  try {
    installNotificationHandler(notifications);
    await ensureAirQualityChannel(notifications);
    const permission = await notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return 0;
    await cancelQueuedReminders(notifications);

    let queued = 0;
    for (const entry of entries) {
      await notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_ID_PREFIX}${entry.date}`,
        content: {
          title: entry.title,
          body: entry.body,
          sound: 'default',
          data: { slug: entry.slug, kind: 'morning-reminder' },
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(entry.at),
          channelId: AIR_QUALITY_CHANNEL,
          // `setAlarmClock` alarms are never deferred by Doze or OEM battery
          // policies; `bestEffort` uses setExactAndAllowWhileIdle, which some
          // phones delay by minutes. expo-notifications falls back on its own
          // when exact alarms are not permitted, so this is never fatal.
          delivery: 'alarmClock',
        },
      });
      queued += 1;
    }
    return queued;
  } catch {
    return 0;
  }
}

/**
 * Whether Android will let an exact alarm through.
 *
 * Android 14+ no longer grants `SCHEDULE_EXACT_ALARM` to newly installed apps, so
 * the morning reminder silently falls back to an inexact alarm (minutes late
 * under Doze) until the user flips "Alarms & reminders" on.
 */
export type ExactAlarmState = 'granted' | 'denied' | 'unavailable';

async function readExactAlarm(
  notifications: NotificationsModule,
  request: boolean,
): Promise<ExactAlarmState> {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    const status = request
      ? await notifications.requestExactAlarmPermissionsAsync()
      : await notifications.getExactAlarmPermissionsAsync();
    return status.status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function exactAlarmState(): Promise<ExactAlarmState> {
  const notifications = loadNotifications();
  if (!notifications) return 'unavailable';
  return readExactAlarm(notifications, false);
}

/**
 * Opens the system screen for exact alarms and re-reads the result when the user
 * comes back. Resolves to `unavailable` on runtimes that cannot show it.
 */
export async function requestExactAlarmPermission(): Promise<ExactAlarmState> {
  const notifications = loadNotifications();
  if (!notifications) return 'unavailable';
  return readExactAlarm(notifications, true);
}

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
  if (!remotePushEnabled) {
    return { token: null, supported: false, reason: DISABLED_REASON };
  }

  if (Platform.OS === 'web') {
    return {
      token: null,
      supported: false,
      reason: 'Push jarak jauh belum didukung di web. Notifikasi dalam aplikasi tetap aktif.',
    };
  }

  if (isExpoGoOnAndroid()) {
    return { token: null, supported: false, reason: EXPO_GO_REASON };
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

    await ensureAirQualityChannel(notifications);

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

  try {
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
  } catch {
    // A runtime without the notification native module must never take the
    // layout down with it.
    return () => {};
  }
}
