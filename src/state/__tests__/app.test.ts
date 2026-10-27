import {
  DEVICE_LOCATION_SLUG,
  findLocation,
  hydrateAppState,
  resetAppState,
  selectCustomLocation,
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
