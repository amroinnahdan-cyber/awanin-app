import { fireEvent, render, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { LocationSheet } from '@/components/LocationSheet';
import { useLocationDirectory, type DirectoryEntry } from '@/hooks/useAirQuality';
import { resetAppState, useAppState } from '@/state/app';

// lucide ships ESM that jest-expo does not transform for this suite; the sheet
// only needs a placeholder glyph, not the icon geometry.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = () => <View />;
  return { Check: Icon, Crosshair: Icon, Search: Icon, Star: Icon, X: Icon };
});

jest.mock('@/lib/persist', () => ({
  loadPersisted: jest.fn(async () => null),
  savePersisted: jest.fn(),
}));

// The sheet only reads the directory for its AQI chips; a mock keeps the test
// off the network and lets each case choose which chips exist.
jest.mock('@/hooks/useAirQuality', () => ({
  useLocationDirectory: jest.fn(),
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

const directory = useLocationDirectory as jest.MockedFunction<typeof useLocationDirectory>;

function withDirectory(data: DirectoryEntry[] | null) {
  directory.mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useLocationDirectory>);
}

type View = Awaited<ReturnType<typeof render>>;

/** Accessible names of every button, in render order. */
function buttonNames(view: View): string[] {
  return view
    .getAllByRole('button')
    .map((node) => String(node.props.accessibilityLabel ?? node.props['aria-label'] ?? ''));
}

function SelectedSlugProbe() {
  const { selected } = useAppState();
  return <Text>{`selected:${selected.slug}`}</Text>;
}

describe('LocationSheet city list', () => {
  beforeEach(() => {
    resetAppState();
    withDirectory([]);
  });

  it('puts the Jakarta landmarks first, then a short list of cities', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    expect(view.getByText('Kota di Indonesia')).toBeTruthy();

    const names = buttonNames(view);
    const lastLandmark = names.indexOf('Kota Tua');
    const firstCity = names.indexOf('Jakarta');
    expect(lastLandmark).toBeGreaterThan(-1);
    expect(firstCity).toBeGreaterThan(lastLandmark);
    expect(names.indexOf('Bandung')).toBeGreaterThan(lastLandmark);
  });

  it('does not render all hundred cities while the search is empty', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    // The empty query shows a shortlist; the rest of the table waits for input.
    expect(view.getByText(/Ketik nama kota untuk mencari dari 100 kota/)).toBeTruthy();
    for (const city of [
      'Jakarta',
      'Surabaya',
      'Bandung',
      'Medan',
      'Semarang',
      'Makassar',
      'Denpasar',
      'Palembang',
    ]) {
      expect(view.getByRole('button', { name: city })).toBeTruthy();
    }
    expect(view.queryByRole('button', { name: 'Banda Aceh' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Langsa' })).toBeNull();
    // 100 cities would be well over a hundred buttons; the shortlist is a fraction.
    expect(buttonNames(view).length).toBeLessThan(50);
  });

  it('reaches a city outside the shortlist once it is typed', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    await fireEvent.changeText(view.getByLabelText('Cari lokasi'), 'banda aceh');

    expect(view.getByRole('button', { name: 'Banda Aceh' })).toBeTruthy();
    expect(view.queryByText(/Ketik nama kota/)).toBeNull();
  });

  it('keeps the AQI chip on landmarks and never fakes one for a city', async () => {
    withDirectory([{ slug: 'monas', name: 'Monas', aqi: 153 }]);
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    const monas = view.getByRole('button', { name: 'Monas' });
    expect(within(monas).getByText('153')).toBeTruthy();

    // A city has no row in the directory, so it must show neither a number nor
    // the "memuat…" placeholder that would stay there forever.
    const bandung = view.getByRole('button', { name: 'Bandung' });
    expect(within(bandung).queryByText('153')).toBeNull();
    expect(within(bandung).queryByText('memuat…')).toBeNull();
    expect(within(bandung).getByText('Jawa Barat')).toBeTruthy();
  });

  it('only says "memuat…" on landmark rows while the directory loads', async () => {
    withDirectory(null);
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    expect(
      within(view.getByRole('button', { name: 'Monas' })).getByText('memuat…'),
    ).toBeTruthy();
    expect(
      within(view.getByRole('button', { name: 'Bandung' })).queryByText('memuat…'),
    ).toBeNull();
  });

  it('filters cities by name and leaves the landmarks out when nothing matches', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    await fireEvent.changeText(view.getByLabelText('Cari lokasi'), 'bandung');

    expect(view.getByRole('button', { name: 'Bandung' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Monas' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Banda Aceh' })).toBeNull();
    expect(view.getByText('Kota di Indonesia')).toBeTruthy();
  });

  it('filters cities by province too', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    await fireEvent.changeText(view.getByLabelText('Cari lokasi'), 'jawa tengah');

    expect(view.getByRole('button', { name: 'Semarang' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Surakarta' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Banda Aceh' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Jakarta Pusat' })).toBeNull();
  });

  it('drops the city section when a landmark alone matches', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    await fireEvent.changeText(view.getByLabelText('Cari lokasi'), 'monas');

    expect(view.getByRole('button', { name: 'Monas' })).toBeTruthy();
    expect(view.queryByText('Kota di Indonesia')).toBeNull();
  });

  it('mentions the nationwide list in the empty state', async () => {
    const view = await render(<LocationSheet visible includeCities onClose={jest.fn()} />);

    await fireEvent.changeText(view.getByLabelText('Cari lokasi'), 'tidak-ada-kota-ini');

    expect(view.getByText(/100 kota Indonesia/)).toBeTruthy();
    expect(view.queryByText('Kota di Indonesia')).toBeNull();
  });

  it('applies the chosen city and closes the sheet', async () => {
    const onClose = jest.fn();
    const view = await render(
      <>
        <LocationSheet visible includeCities onClose={onClose} />
        <SelectedSlugProbe />
      </>,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Makassar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(view.getByText('selected:makassar')).toBeTruthy();
  });

  it('stays Jakarta-only for screens that did not opt in', async () => {
    const view = await render(<LocationSheet visible onClose={jest.fn()} />);

    expect(view.queryByText('Kota di Indonesia')).toBeNull();
    expect(view.queryByRole('button', { name: 'Bandung' })).toBeNull();

    await fireEvent.changeText(view.getByLabelText('Cari lokasi'), 'bandung');
    expect(view.getByText(/lima titik di Jakarta/)).toBeTruthy();
  });
});
