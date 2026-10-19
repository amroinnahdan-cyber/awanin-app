import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Info,
  LogOut,
  MapPin,
  Send,
  SlidersHorizontal,
  Wifi,
} from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { Sheet, SheetRow, Segmented } from '@/components/Sheet';
import { Card, Divider } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import { removeSubscription } from '@/lib/subscription';
import {
  ALL_LOCATIONS,
  resetAppState,
  updateSettings,
  useAppState,
  USER_PROFILE,
} from '@/state/app';
import { usePushState } from '@/state/push';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

type SheetName = 'preferensi' | 'keluar' | null;

type SettingRow = {
  key: string;
  label: string;
  value?: string;
  icon: (props: { size: number; color: string; strokeWidth: number }) => ReactNode;
  onPress: () => void;
  trailing?: ReactNode;
};

const PUSH_LABEL: Record<string, string> = {
  idle: 'Belum tersambung',
  syncing: 'Menyinkronkan…',
  connected: 'Aktif di server',
  unsupported: 'Terbatas',
  error: 'Gagal tersambung',
};

/**
 * Profile rows follow the design showcase: location, notification toggle,
 * preferences, about, share, sign out. Every row does something real.
 */
export default function ProfilScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { selected, favorites, settings } = useAppState();
  const push = usePushState();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const shareApp = () => {
    void Share.share({
      message:
        'Awanin — Know Your Air. Pantau kualitas udara Jakarta lewat aplikasi ini: ' +
        'AQI real-time, prakiraan, peta lokasi, riwayat, dan tips kesehatan.',
    });
  };

  const rows: SettingRow[] = [
    {
      key: 'lokasi',
      label: 'Lokasi Saya',
      value: selected.name,
      icon: MapPin,
      onPress: () => setPickerOpen(true),
    },
    {
      key: 'notifikasi',
      label: 'Notifikasi',
      icon: Bell,
      onPress: () => router.push('/notifikasi'),
      trailing: (
        <Switch
          value={settings.notifMaster}
          onValueChange={(next) => updateSettings({ notifMaster: next })}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel="Aktifkan notifikasi"
        />
      ),
    },
    {
      key: 'server',
      label: 'Server & push',
      value: PUSH_LABEL[push.status] ?? 'Belum tersambung',
      icon: Wifi,
      onPress: () => router.push('/notifikasi'),
    },
    {
      key: 'preferensi',
      label: 'Preferensi',
      value: 'Tema, Lokasi, Satuan',
      icon: SlidersHorizontal,
      onPress: () => setSheet('preferensi'),
    },
    {
      key: 'tentang',
      label: 'Tentang Awanin',
      value: 'v1.0.0',
      icon: Info,
      onPress: () => router.push('/tentang'),
    },
    {
      key: 'bagikan',
      label: 'Beritahu Teman',
      icon: Send,
      onPress: shareApp,
    },
    {
      key: 'keluar',
      label: 'Keluar',
      icon: LogOut,
      onPress: () => setSheet('keluar'),
    },
  ];

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
          <LinearGradient colors={[colors.sky, colors.tint]} style={styles.avatar}>
            <Text style={styles.initials}>{USER_PROFILE.initials}</Text>
          </LinearGradient>
          <View style={styles.identityText}>
            <Text style={styles.name}>{USER_PROFILE.name}</Text>
            <Text style={styles.handle}>{USER_PROFILE.email}</Text>
          </View>
        </Card>

        <Card style={styles.group}>
          {rows.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={row.label}
                onPress={row.onPress}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <row.icon size={20} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.rowLabel}>{row.label}</Text>
                {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                {row.trailing ?? (
                  <ChevronRight size={18} color={colors.muted} strokeWidth={1.8} />
                )}
              </Pressable>
            </View>
          ))}
        </Card>
      </View>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />

      <Sheet
        visible={sheet === 'preferensi'}
        title="Preferensi"
        subtitle={`Lokasi favorit: ${favorites.length} · Skala US AQI`}
        onClose={() => setSheet(null)}
      >
        <SheetRow label="Tema" hint="Mengikuti pengaturan perangkat secara default" />
        <View style={styles.segment}>
          <Segmented
            options={[
              { label: 'Sistem', value: 'system' },
              { label: 'Terang', value: 'light' },
              { label: 'Gelap', value: 'dark' },
            ]}
            value={settings.themeMode}
            onChange={(next) => updateSettings({ themeMode: next })}
          />
        </View>
        <Divider />
        <SheetRow label="Satuan suhu" hint="Dipakai di Beranda & Detail Lokasi" />
        <View style={styles.segment}>
          <Segmented
            options={[
              { label: '°C', value: 'C' },
              { label: '°F', value: 'F' },
            ]}
            value={settings.temperatureUnit}
            onChange={(next) => updateSettings({ temperatureUnit: next })}
          />
        </View>
        <Divider />
        {ALL_LOCATIONS.map((entry) => (
          <SheetRow
            key={entry.slug}
            icon={<MapPin size={18} color={colors.accent} strokeWidth={1.8} />}
            label={entry.name}
            hint={entry.area}
            value={favorites.includes(entry.slug) ? 'Favorit' : undefined}
          />
        ))}
      </Sheet>

      <Sheet
        visible={sheet === 'keluar'}
        title="Keluar dari Awanin?"
        subtitle="Pengaturan, favorit, dan langganan notifikasi akan dihapus dari perangkat."
        onClose={() => setSheet(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ya, keluar"
          onPress={() => {
            void removeSubscription();
            resetAppState();
            setSheet(null);
          }}
          style={({ pressed }) => [styles.logoutConfirm, pressed && styles.rowPressed]}
        >
          <LogOut size={18} color={colors.onAccent} strokeWidth={2} />
          <Text style={styles.logoutConfirmLabel}>Ya, keluar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Batal"
          onPress={() => setSheet(null)}
          style={({ pressed }) => [styles.logoutCancel, pressed && styles.rowPressed]}
        >
          <Text style={styles.logoutCancelLabel}>Batal</Text>
        </Pressable>
      </Sheet>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingBottom: 24,
    },
    header: {
      height: 56,
      paddingHorizontal: spacing.gutter,
      justifyContent: 'center' as const,
    },
    headerTitle: {
      ...typo.title,
      color: colors.ink,
    },
    sections: {
      paddingHorizontal: spacing.gutter,
      gap: spacing.section,
      marginTop: 6,
    },
    identity: {
      padding: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 13,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    initials: {
      ...typo.heading,
      color: colors.accent,
    },
    identityText: {
      gap: 2,
    },
    name: {
      ...typo.heading,
      fontSize: 16,
      color: colors.ink,
    },
    handle: {
      ...typo.caption,
      color: colors.mutedText,
    },
    group: {
      paddingHorizontal: 4,
    },
    row: {
      minHeight: 58,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingHorizontal: 12,
      borderRadius: radius.control,
    },
    rowPressed: {
      backgroundColor: colors.tint,
      opacity: 0.9,
    },
    rowLabel: {
      ...typo.body,
      fontFamily: font.bold,
      flex: 1,
      color: colors.ink,
    },
    rowValue: {
      ...typo.caption,
      color: colors.mutedText,
    },
    segment: {
      paddingHorizontal: 6,
      paddingBottom: 10,
    },
    logoutConfirm: {
      height: 50,
      borderRadius: radius.card,
      backgroundColor: colors.accent,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    logoutConfirmLabel: {
      ...typo.bodyStrong,
      fontSize: 14,
      color: colors.onAccent,
    },
    logoutCancel: {
      height: 50,
      borderRadius: radius.card,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 10,
    },
    logoutCancelLabel: {
      ...typo.bodyStrong,
      fontSize: 14,
      color: colors.ink,
    },
  };
}
