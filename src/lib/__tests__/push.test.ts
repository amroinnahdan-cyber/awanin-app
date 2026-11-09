/**
 * Regression test for the Expo Go crash:
 *
 *   [Error: Cannot find native module 'ExpoTopicSubscriptionModule']
 *
 * `expo-notifications` resolves that native module while its index is evaluated,
 * and Expo Go on Android does not ship it. A `try/catch` around `require` cannot
 * save the app there (Metro reports module-evaluation errors with
 * `ErrorUtils.reportFatalError` instead of rethrowing), so the package must not
 * be required at all in that runtime.
 */
const mockRequireNativePackage = jest.fn();

type PushModule = typeof import('@/lib/push');

function loadPush(options: { os: 'android' | 'ios'; runningInExpoGo: boolean }): PushModule {
  jest.resetModules();
  mockRequireNativePackage.mockClear();

  jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
    __esModule: true,
    default: {
      OS: options.os,
      Version: 34,
      isTesting: true,
      select: (obj: Record<string, unknown>) =>
        obj[options.os] !== undefined ? obj[options.os] : obj.default,
    },
  }));
  jest.doMock('expo', () => ({
    ...jest.requireActual('expo'),
    isRunningInExpoGo: () => options.runningInExpoGo,
  }));
  jest.doMock('expo-notifications', () => {
    mockRequireNativePackage();
    throw new Error("Cannot find native module 'ExpoTopicSubscriptionModule'");
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/lib/push') as PushModule;
  // The default build ships with remote push disabled (no google-services.json
  // yet); tests that exercise the deep registration paths opt back in.
  mod.setRemotePushEnabled(true);
  return mod;
}

afterEach(() => {
  jest.dontMock('react-native/Libraries/Utilities/Platform');
  jest.dontMock('expo');
  jest.dontMock('expo-notifications');
  jest.resetModules();
});

describe('remote push disabled by default', () => {
  it('short-circuits before touching expo-notifications and stays calm', async () => {
    const push = loadPush({ os: 'android', runningInExpoGo: false });
    push.setRemotePushEnabled(false);

    const registration = await push.registerForPush();
    expect(registration.supported).toBe(false);
    expect(registration.token).toBeNull();
    expect(registration.reason).toMatch(/dimatikan sementara/);
    expect(registration.reason).not.toMatch(/Firebase|FirebaseApp/);

    expect(mockRequireNativePackage).not.toHaveBeenCalled();
  });
});

describe('push in Expo Go on Android', () => {
  it('never loads expo-notifications and reports the limitation', async () => {
    const push = loadPush({ os: 'android', runningInExpoGo: true });

    const registration = await push.registerForPush();
    expect(registration.supported).toBe(false);
    expect(registration.token).toBeNull();
    expect(registration.reason).toMatch(/Expo Go/);

    const unsubscribe = push.attachNotificationNavigation(() => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();

    expect(mockRequireNativePackage).not.toHaveBeenCalled();
  });
});

type NotificationsMock = {
  status: 'granted' | 'denied' | 'undetermined';
  requestStatus: 'granted' | 'denied';
  setNotificationChannelAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
};

function loadPushWithNotificationsMock(options: {
  os: 'android' | 'ios';
  runningInExpoGo: boolean;
  status?: 'granted' | 'denied' | 'undetermined';
  requestStatus?: 'granted' | 'denied';
}): { push: PushModule; api: NotificationsMock } {
  jest.resetModules();

  const api: NotificationsMock = {
    status: options.status ?? 'granted',
    requestStatus: options.requestStatus ?? 'granted',
    setNotificationChannelAsync: jest.fn(async () => null),
    scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
    requestPermissionsAsync: jest.fn(async () => ({ status: api.requestStatus })),
    getAllScheduledNotificationsAsync: jest.fn(async () => [] as { identifier: string }[]),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  };

  jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
    __esModule: true,
    default: {
      OS: options.os,
      Version: 34,
      isTesting: true,
      select: (obj: Record<string, unknown>) =>
        obj[options.os] !== undefined ? obj[options.os] : obj.default,
    },
  }));
  jest.doMock('expo', () => ({
    ...jest.requireActual('expo'),
    isRunningInExpoGo: () => options.runningInExpoGo,
  }));
  jest.doMock('expo-notifications', () => ({
    AndroidImportance: { HIGH: 4 },
    setNotificationHandler: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    getPermissionsAsync: jest.fn(async () => ({ status: api.status })),
    requestPermissionsAsync: api.requestPermissionsAsync,
    setNotificationChannelAsync: api.setNotificationChannelAsync,
    scheduleNotificationAsync: api.scheduleNotificationAsync,
    getAllScheduledNotificationsAsync: api.getAllScheduledNotificationsAsync,
    cancelScheduledNotificationAsync: api.cancelScheduledNotificationAsync,
    // Mirrors the enum expo-notifications exports; only DATE is used here.
    SchedulableTriggerInputTypes: { DATE: 'date' },
  }));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const push = require('@/lib/push') as PushModule;
  return { push, api };
}

describe('local notifications (no Firebase)', () => {
  it('shows the feed entry as a device notification when permitted', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: false,
    });

    await push.presentLocalNotification({
      title: 'Jakarta Pusat: kualitas udara kini sedang',
      body: 'AQI tercatat 92.',
      slug: 'jakarta-pusat',
    });

    expect(api.setNotificationChannelAsync).toHaveBeenCalledWith(
      'air-quality',
      expect.objectContaining({ name: 'Kualitas udara' }),
    );
    expect(api.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(api.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: 'Jakarta Pusat: kualitas udara kini sedang',
        body: 'AQI tercatat 92.',
        data: { slug: 'jakarta-pusat' },
      }),
      trigger: null,
    });
  });

  it('stays silent instead of prompting when permission was declined', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: false,
      status: 'denied',
    });

    await push.presentLocalNotification({ title: 'Ringkasan', body: 'AQI 80.', slug: 'bandung' });

    expect(api.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('asks for permission when the user turns notifications on', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: false,
      status: 'undetermined',
      requestStatus: 'granted',
    });

    await expect(push.ensureNotificationPermission()).resolves.toBe(true);
    expect(api.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('never touches the package in Expo Go on Android', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: true,
    });

    await expect(push.ensureNotificationPermission()).resolves.toBe(false);
    await push.presentLocalNotification({ title: 'x', body: 'y', slug: 'z' });
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('push outside Expo Go', () => {
  it('still loads the package and degrades gracefully when it throws', async () => {
    const push = loadPush({ os: 'android', runningInExpoGo: false });

    const registration = await push.registerForPush();
    expect(mockRequireNativePackage).toHaveBeenCalledTimes(1);
    expect(registration.supported).toBe(false);
    expect(registration.reason).toMatch(/modul push tidak ditemukan/);
  });

  it('keeps iOS Expo Go on the existing lazy-load path', async () => {
    const push = loadPush({ os: 'ios', runningInExpoGo: true });

    await push.registerForPush();
    expect(mockRequireNativePackage).toHaveBeenCalledTimes(1);
  });
});

describe('morning reminders (scheduled locally, no server)', () => {
  const entry = {
    date: '2026-11-10',
    at: Date.UTC(2026, 10, 9, 23),
    title: 'Selamat pagi · Jakarta Pusat',
    body: 'US AQI prakiraan 10 Nov: 95 (Sedang). Udara sedang, tetap jaga kondisi tubuhmu.',
    slug: 'jakarta-pusat',
  };

  it('queues one dated notification per forecast day', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: false,
    });

    await expect(push.scheduleMorningReminders([entry])).resolves.toBe(1);

    expect(api.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'awanin-morning-2026-11-10',
      content: expect.objectContaining({
        title: entry.title,
        body: entry.body,
        data: { slug: 'jakarta-pusat', kind: 'morning-reminder' },
      }),
      trigger: { type: 'date', date: new Date(entry.at), channelId: 'air-quality' },
    });
  });

  it('cancels only its own queued reminders', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: false,
    });
    api.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'awanin-morning-2026-11-01' },
      { identifier: 'someone-else' },
    ]);

    await push.cancelMorningReminders();

    expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledWith('awanin-morning-2026-11-01');
  });

  it('queues nothing when permission was declined', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: false,
      status: 'denied',
    });

    await expect(push.scheduleMorningReminders([entry])).resolves.toBe(0);
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('never touches the package in Expo Go on Android', async () => {
    const { push, api } = loadPushWithNotificationsMock({
      os: 'android',
      runningInExpoGo: true,
    });

    await expect(push.scheduleMorningReminders([entry])).resolves.toBe(0);
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
