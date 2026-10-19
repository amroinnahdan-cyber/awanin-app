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
  return require('@/lib/push') as PushModule;
}

afterEach(() => {
  jest.dontMock('react-native/Libraries/Utilities/Platform');
  jest.dontMock('expo');
  jest.dontMock('expo-notifications');
  jest.resetModules();
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
