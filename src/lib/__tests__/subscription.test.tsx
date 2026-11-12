import { fireEvent, render } from '@testing-library/react-native';

import { LocationSheet } from '@/components/LocationSheet';
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { syncPushSubscription } from '@/lib/subscription';
import { resetAppState, useAppState, type AppLocation, type AppSettings } from '@/state/app';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = () => <View />;
  return { Check: Icon, Crosshair: Icon, Search: Icon, Star: Icon, X: Icon };
});

jest.mock('@/lib/persist', () => ({
  loadPersisted: jest.fn(async () => null),
  savePersisted: jest.fn(),
}));

jest.mock('@/hooks/useAirQuality', () => ({
  useLocationDirectory: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: jest.fn(() => ({
    locating: false,
    error: null,
    needsSettings: false,
    openSettings: jest.fn(),
    locate: jest.fn(async () => false),
    locateSilently: jest.fn(async () => false),
  })),
}));

jest.mock('@/lib/push', () => ({
  registerForPush: jest.fn(async () => ({
    token: null,
    supported: false,
    reason: 'Push jarak jauh dimatikan sementara.',
  })),
}));

jest.mock('@/lib/device', () => ({
  getDeviceId: jest.fn(async () => 'device-1'),
}));

jest.mock('@/api/backend', () => ({
  backendConfigured: jest.fn(() => true),
  platformForBackend: jest.fn(() => 'android'),
  registerDevice: jest.fn(async () => ({
    created: false,
    device: { deviceId: 'device-1', pushToken: null, platform: 'android' },
    preferences: {},
  })),
  patchDevice: jest.fn(async () => ({
    device: { deviceId: 'device-1' },
    preferences: {},
  })),
  deleteDevice: jest.fn(),
  sendTestPush: jest.fn(),
}));

const { patchDevice } = jest.requireMock('@/api/backend') as { patchDevice: jest.Mock };

describe('notification location → server preferences', () => {
  beforeEach(() => {
    resetAppState();
    patchDevice.mockClear();
  });

  it('sends the city picked in the Notifikasi sheet as the preference slug', async () => {
    const latest: { selected?: AppLocation; settings?: AppSettings } = {};

    // Same store the root layout reads when it mirrors settings to the server.
    function Capture() {
      const state = useAppState();
      latest.selected = state.selected;
      latest.settings = state.settings;
      return null;
    }

    const view = await render(
      <>
        <LocationSheet visible includeCities onClose={jest.fn()} />
        <Capture />
      </>,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Bandung' }));

    expect(latest.selected?.slug).toBe('bandung');
    expect(latest.settings).toBeTruthy();

    await syncPushSubscription(latest.selected as AppLocation, latest.settings as AppSettings);

    expect(patchDevice).toHaveBeenCalledTimes(1);
    const [deviceId, payload] = patchDevice.mock.calls[0];
    expect(deviceId).toBe('device-1');
    expect(payload.preferences.locationSlug).toBe('bandung');

    // The coordinates travel with the slug, so the server labels the alert
    // "Bandung" instead of falling back to "Lokasi saya".
    const bandung = INDONESIA_CITIES.find((city) => city.slug === 'bandung');
    expect(payload.preferences.latitude).toBeCloseTo(bandung?.latitude ?? NaN, 4);
    expect(payload.preferences.longitude).toBeCloseTo(bandung?.longitude ?? NaN, 4);
  });
});
