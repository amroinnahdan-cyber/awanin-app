import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Info,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  Shield,
  Star,
} from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Sheet, SheetRow, Segmented, SwitchRow } from '@/components/Sheet';
import { Card, Divider } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import {
  ALL_LOCATIONS,
  resetAppState,
  toggleFavorite,
  updateSettings,
  useAppState,
} from '@/state/app';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

type SheetName = 'notifikasi' | 'favorit' | 'unit' | 'keluar' | null;

type SettingRow = {
  key: string;
  label: string;
  value?: string;
  icon: (props: { size: number; color: string; strokeWidth: number }) => ReactNode;
  onPress: () => void;
};

/**
 * Row content is inferred: Figma nodes 2027:8550 / 2027:8557 / 2027:8564 / 2027:8571
 * came back without their child text (API rate limit), so the row height (64),
 * padding (16), gap (12) and dividers follow the file while the labels are typical
 * profile settings. Every row now opens something real.
 */
export default function ProfilScreen() {
  const topInset = useTopInset();
  const { selected, favorites, settings } = useAppState();
  const [sheet, setSheet] = useState<SheetName>(null);

  const accountRows: SettingRow[] = [
    {
      key: 'notifikasi',
      label: 'Notifikasi',
      value: settings.badAirAlerts ? 'Aktif' : 'Nonaktif',
      icon: Bell,
      onPress: () => setSheet('notifikasi'),
    },
    {
      key: 'lokasi',
      label: 'Lokasi favorit',
      value: `${favorites.length}`,
      icon: MapPin,
      onPress: () => setSheet('favorit'),
    },
    {
      key: 'unit',
      label: 'Unit & format',
      value: `°${settings.temperatureUnit}`,
      icon: Settings,
      onPress: () => setSheet('unit'),
    },
    {
      key: 'privasi',
      label: 'Privasi & keamanan',
      icon: Shield,
      onPress: () => router.push('/privasi'),
    },
  ];

  const generalRows: SettingRow[] = [
    {
      key: 'bantuan',
      label: 'Bantuan',
      icon: MessageCircle,
      onPress: () => router.push('/bantuan'),
    },
    {
      key: 'tentang',
      label: 'Tentang Awanin',
      icon: Info,
      onPress: () => router.push('/tentang'),
    },
  ];

  const groups = [accountRows, generalRows];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <View style={styles.sections}>
        <Card tone="tint" style={styles.identity}>
          <LinearGradient colors={[color.sky, color.tint]} style={styles.avatar}>
            <Text style={styles.initials}>DN</Text>
          </LinearGradient>
          <View style={styles.identityText}>
            <Text style={styles.name}>Dzul Nahdan</Text>
            <Text style={styles.handle}>{selected.name} · {selected.area}</Text>
          </View>
        </Card>

        {groups.map((rows, groupIndex) => (
          <Card key={groupIndex} style={styles.group}>
            {rows.map((row, index) => (
              <View key={row.key}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                  onPress={row.onPress}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <row.icon size={20} color={color.accent} strokeWidth={1.8} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                  <ChevronRight size={18} color={color.muted} strokeWidth={1.8} />
                </Pressable>
              </View>
            ))}
          </Card>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keluar"
          onPress={() => setSheet('keluar')}
          style={({ pressed }) => [styles.logout, pressed && styles.rowPressed]}
        >
          <LogOut size={18} color={color.accent} strokeWidth={1.8} />
          <Text style={styles.logoutLabel}>Keluar</Text>
        </Pressable>
      </View>

      <Sheet
        visible={sheet === 'notifikasi'}
        title="Notifikasi"
        subtitle="Awanin mengabari saat kategori udara berubah"
        onClose={() => setSheet(null)}
      >
        <SwitchRow
          label="Peringatan udara buruk"
          hint="Saat kategori berpindah ke Tidak Sehat atau lebih buruk"
          value={settings.badAirAlerts}
          onChange={(next) => updateSettings({ badAirAlerts: next })}
        />
        <SwitchRow
          label="Ringkasan harian"
          hint="Satu ringkasan AQI setiap pagi"
          value={settings.dailySummary}
          onChange={(next) => updateSettings({ dailySummary: next })}
        />
        <SheetRow
          label="Buka daftar notifikasi"
          hint="Perubahan kategori yang tercatat sesi ini"
          onPress={() => {
            setSheet(null);
            router.push('/notifikasi');
          }}
        />
      </Sheet>

      <Sheet
        visible={sheet === 'favorit'}
        title="Lokasi favorit"
        subtitle="Tandai lokasi agar cepat dipilih di Beranda"
        onClose={() => setSheet(null)}
      >
        {ALL_LOCATIONS.map((entry) => {
          const isFavorite = favorites.includes(entry.slug);
          return (
            <SheetRow
              key={entry.slug}
              icon={
                <Star
                  size={16}
                  color={isFavorite ? color.caution : color.muted}
                  fill={isFavorite ? color.caution : 'transparent'}
                  strokeWidth={1.8}
                />
              }
              label={entry.name}
              hint={entry.area}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFavorite ? `Hapus ${entry.name} dari favorit` : `Simpan ${entry.name} ke favorit`
                  }
                  hitSlop={8}
                  onPress={() => toggleFavorite(entry.slug)}
                >
                  <Text style={styles.favoriteAction}>
                    {isFavorite ? 'Hapus' : 'Simpan'}
                  </Text>
                </Pressable>
              }
            />
          );
        })}
        <SheetRow
          label="Kelola di peta"
          hint="Pilih lokasi dan lihat sebarannya"
          onPress={() => {
            setSheet(null);
            router.push('/peta');
          }}
        />
      </Sheet>

      <Sheet
        visible={sheet === 'unit'}
        title="Unit & format"
        subtitle="Berlaku di Beranda dan halaman detail"
        onClose={() => setSheet(null)}
      >
        <Text style={styles.sheetLabel}>Suhu</Text>
        <Segmented
          options={[
            { value: 'C', label: '°C' },
            { value: 'F', label: '°F' },
          ]}
          value={settings.temperatureUnit}
          onChange={(next) => updateSettings({ temperatureUnit: next })}
        />
        <SheetRow
          label="Kecepatan angin"
          value="km/j"
          hint="Satuan tetap, mengikuti data Open-Meteo"
        />
      </Sheet>

      <Sheet
        visible={sheet === 'keluar'}
        title="Keluar dari Awanin?"
        subtitle="Pilihan lokasi, favorit, dan pengaturan kembali ke awal"
        onClose={() => setSheet(null)}
      >
        <SheetRow
          label="Ya, keluar"
          hint="Data hanya ada di sesi ini, jadi tidak ada yang dihapus permanen"
          onPress={() => {
            resetAppState();
            setSheet(null);
            router.navigate('/');
          }}
        />
        <SheetRow label="Batal" onPress={() => setSheet(null)} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.gutter,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typo.title,
    color: color.ink,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.section,
  },
  identity: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 91,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: font.bold,
    fontSize: 15,
    lineHeight: 21,
    color: color.accent,
  },
  identityText: {
    gap: 1,
    flex: 1,
  },
  name: {
    ...typo.heading,
    color: color.ink,
  },
  handle: {
    ...typo.caption,
    color: color.mutedText,
  },
  group: {
    padding: 16,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLabel: {
    ...typo.body,
    flex: 1,
    color: color.ink,
  },
  rowValue: {
    ...typo.caption,
    color: color.mutedText,
  },
  logout: {
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutLabel: {
    ...typo.bodyStrong,
    color: color.accent,
  },
  favoriteAction: {
    ...typo.caption,
    fontFamily: font.bold,
    color: color.accent,
  },
  sheetLabel: {
    ...typo.caption,
    color: color.mutedText,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
});
