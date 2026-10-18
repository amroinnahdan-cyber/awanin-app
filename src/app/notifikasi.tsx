import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Lightbulb, MapPin, Trash2 } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { SheetRow, SwitchRow } from '@/components/Sheet';
import { Card, Divider } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import { locationSlug } from '@/api/openMeteo';
import { useBackOrHome } from '@/lib/navigation';
import {
  clearNotificationCache,
  markAllRead,
  useNotifications,
} from '@/state/notifications';
import { updateSettings, useAppState } from '@/state/app';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

/**
 * Notification preferences, as in the design showcase — every toggle is wired
 * to the real notification store. When live events exist (AQI category changes),
 * they appear in a compact "Terbaru" card above the settings.
 */
export default function NotifikasiScreen() {
  const topInset = useTopInset();
  const goBack = useBackOrHome();
  const { selected, settings } = useAppState();
  const notifications = useNotifications();
  const [pickerOpen, setPickerOpen] = useState(false);

  const recent = notifications.slice(0, 3);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ paddingTop: topInset }}>
        <DeviceStatusBar />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={12}
          onPress={goBack}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        {notifications.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bersihkan semua notifikasi"
            hitSlop={8}
            onPress={clearNotificationCache}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Trash2 size={18} color={color.mutedText} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sections}>
        {recent.length > 0 ? (
          <Card style={styles.feed}>
            <View style={styles.feedHead}>
              <Text style={styles.feedTitle}>Terbaru</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tandai semua dibaca"
                hitSlop={8}
                onPress={markAllRead}
              >
                <Text style={styles.feedAction}>Tandai dibaca</Text>
              </Pressable>
            </View>
            {recent.map((entry, index) => (
              <View key={entry.id}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.title}. Buka ${entry.place}`}
                  onPress={() =>
                    router.push({
                      pathname: '/lokasi/[slug]',
                      params: { slug: locationSlug(entry.place) },
                    })
                  }
                  style={({ pressed }) => [styles.feedItem, pressed && styles.pressed]}
                >
                  <View
                    style={[
                      styles.feedDot,
                      { backgroundColor: entry.tone === 'warning' ? color.caution : color.accent },
                    ]}
                  />
                  <View style={styles.feedText}>
                    <Text style={styles.feedItemTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Text style={styles.feedItemBody} numberOfLines={2}>
                      {entry.body}
                    </Text>
                    <Text style={styles.feedItemTime}>{entry.time}</Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.master}>
          <View style={styles.masterText}>
            <Text style={styles.masterTitle}>Peringatan Kualitas Udara</Text>
            <Text style={styles.masterBody}>
              Dapatkan notifikasi saat AQI mencapai level tidak sehat.
            </Text>
          </View>
          <Switch
            value={settings.notifMaster}
            onValueChange={(next) => updateSettings({ notifMaster: next })}
            trackColor={{ true: color.accent, false: color.border }}
            thumbColor={color.surface}
            accessibilityLabel="Peringatan Kualitas Udara"
          />
        </Card>

        <Text style={styles.sectionLabel}>Jenis Notifikasi</Text>
        <Card style={styles.group}>
          <SwitchRow
            label="Peringatan AQI Tinggi"
            hint="Saat kategori kualitas udara memburuk"
            value={settings.notifMaster && settings.badAirAlerts}
            onChange={(next) => updateSettings({ badAirAlerts: next })}
          />
          <Divider />
          <SwitchRow
            label="Tips Kesehatan"
            hint="Saran singkat menyertai tiap notifikasi"
            value={settings.tipsHealth}
            onChange={(next) => updateSettings({ tipsHealth: next })}
          />
          <Divider />
          <SwitchRow
            label="Update Cuaca"
            hint="Ringkasan harian: AQI & cuaca"
            value={settings.notifMaster && settings.weatherUpdate}
            onChange={(next) => updateSettings({ weatherUpdate: next })}
          />
        </Card>

        <Text style={styles.sectionLabel}>Lokasi Notifikasi</Text>
        <Card style={styles.group}>
          <SheetRow
            icon={<MapPin size={19} color={color.accent} strokeWidth={1.8} />}
            label={selected.name}
            hint={selected.area}
            value="Ubah"
            onPress={() => setPickerOpen(true)}
          />
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Simpan pengaturan notifikasi"
          onPress={() => {
            goBack();
          }}
          style={({ pressed }) => [styles.save, pressed && styles.savePressed]}
        >
          <Text style={styles.saveLabel}>Simpan</Text>
        </Pressable>

        <View style={styles.legendRow}>
          <Lightbulb size={13} color={color.mutedText} strokeWidth={1.8} />
          <Text style={styles.legendText}>
            Notifikasi tercatat nyata saat aplikasi berjalan — lihat ikon lonceng di Beranda.
          </Text>
        </View>
      </View>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    ...typo.title,
    flex: 1,
    color: color.ink,
  },
  pressed: {
    opacity: 0.65,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    gap: 12,
    marginTop: 4,
  },
  feed: {
    padding: 14,
    gap: 10,
  },
  feedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedTitle: {
    ...typo.bodyStrong,
    fontSize: 14,
    color: color.ink,
  },
  feedAction: {
    ...typo.caption,
    color: color.accent,
  },
  feedItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  feedText: {
    flex: 1,
    gap: 2,
  },
  feedItemTitle: {
    ...typo.bodyStrong,
    color: color.ink,
  },
  feedItemBody: {
    ...typo.caption,
    color: color.mutedText,
  },
  feedItemTime: {
    ...typo.micro,
    color: color.mutedText,
  },
  master: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  masterText: {
    flex: 1,
    gap: 3,
  },
  masterTitle: {
    ...typo.bodyStrong,
    fontSize: 14,
    color: color.ink,
  },
  masterBody: {
    ...typo.caption,
    color: color.mutedText,
  },
  sectionLabel: {
    ...typo.caption,
    fontFamily: font.bold,
    color: color.mutedText,
    marginTop: 4,
    marginLeft: 4,
  },
  group: {
    paddingHorizontal: 4,
  },
  save: {
    height: 52,
    borderRadius: radius.card,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  savePressed: {
    opacity: 0.85,
  },
  saveLabel: {
    ...typo.bodyStrong,
    fontSize: 15,
    color: color.surface,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 2,
  },
  legendText: {
    ...typo.micro,
    color: color.mutedText,
    flexShrink: 1,
  },
});
