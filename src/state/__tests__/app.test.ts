import { act, renderHook } from '@testing-library/react-native';

import {
  DEVICE_LOCATION_SLUG,
  findLocation,
  hydrateAppState,
  resetAppState,
  selectCustomLocation,
  selectDeviceLocation,
  selectLocation,
  shouldFollowDevice,
  useAppState,
} from '@/state/app';

jest.mock('@/lib/persist', () => ({
  loadPersisted: jest.fn(async () => null),
  savePersisted: jest.fn(),
}));

const { loadPersisted } = jest.requireMock('@/lib/persist') as { loadPersisted: jest.Mock };

function savedPoint(latitude: number, longitude: number) {
  return {
    name: 'Lokasi saya',
    area: 'Lokasi perangkat',
    latitude,
    longitude,
  };
}

describe('device location zone', () => {
  afterEach(() => {
    resetAppState();
  });

  it('keeps the zone of a fix outside WIB', () => {
    // A Makassar fix used to be stored as Asia/Jakarta, which showed every
    // forecast hour one hour late.
    selectCustomLocation('Makassar', -5.1486, 119.4319);
    expect(findLocation(DEVICE_LOCATION_SLUG)?.location.timezone).toBe('Asia/Makassar');
  });

  it('names the fix after the nearest known city', () => {
    // A stale reverse-geocode label ("Santa Clara County") must not reach the
    // home screen when the coordinates sit inside Bekasi.
    selectCustomLocation('Santa Clara County', -6.2349, 106.9896);
    const device = findLocation(DEVICE_LOCATION_SLUG);
    expect(device?.name).toBe('Bekasi');
    expect(device?.area).toBe('Jawa Barat');
  });

  it('follows fresh fixes until the user picks a place by hand', async () => {
    const { result } = await renderHook(() => useAppState());
    await act(() => selectCustomLocation('Bekasi', -6.2349, 106.9896));
    expect(result.current.selected.name).toBe('Bekasi');
    expect(shouldFollowDevice()).toBe(true);

    await act(() => selectLocation('monas'));
    expect(shouldFollowDevice()).toBe(false);

    // A later fix refreshes the device pin but leaves the explicit pick alone.
    await act(() => selectCustomLocation('Bekasi', -6.22, 106.99));
    expect(result.current.selected.slug).toBe('monas');
    expect(findLocation(DEVICE_LOCATION_SLUG)?.location.latitude).toBeCloseTo(-6.22, 5);
  });

  it('returns to following the device after re-selecting it', async () => {
    const { result } = await renderHook(() => useAppState());
    await act(() => selectCustomLocation('Bekasi', -6.2349, 106.9896));
    await act(() => selectLocation('monas'));
    await act(() => selectDeviceLocation());
    expect(result.current.selected.slug).toBe(DEVICE_LOCATION_SLUG);
    expect(shouldFollowDevice()).toBe(true);

    await act(() => selectCustomLocation('Bekasi', -6.22, 106.99));
    expect(result.current.selected.location.latitude).toBeCloseTo(-6.22, 5);
  });

  it('re-derives the zone when a saved point is restored', () => {
    loadPersisted.mockResolvedValueOnce({
      selectedSlug: DEVICE_LOCATION_SLUG,
      selected: savedPoint(-2.5337, 140.7181),
      deviceLocation: savedPoint(-2.5337, 140.7181),
      favorites: [],
      settings: {},
    });

    return hydrateAppState().then(() => {
      // The zone is not persisted, so it has to come back from the coordinates.
      expect(findLocation(DEVICE_LOCATION_SLUG)?.location.timezone).toBe('Asia/Jayapura');
    });
  });
});
