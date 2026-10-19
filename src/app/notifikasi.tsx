import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, BellRing, Cloud, Lightbulb, MapPin, Server, Trash2 } from 'lucide-react-native';

import { backendConfigured, type RemoteNotification } from '@/api/backend';
import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { LocationSheet } from '@/components/LocationSheet';
import { SheetRow, SwitchRow } from '@/components/Sheet';
import { Card, Divider } from '@/components/ui';
import { useRemoteNotifications } from '@/hooks/useRemoteNotifications';
import { useTopInset } from '@/hooks/useTopInset';
import { locationSlug } from '@/api/openMeteo';
import { relativeTime } from '@/lib/format';
import { useBackOrHome } from '@/lib/navigation';
import { sendTestNotification, syncPushSubscription } from '@/lib/subscription';
import {
  clearNotificationCache,
  markAllRead,
  useNotifications,
} from '@/state/notifications';
import { updateSettings, useAppState } from '@/state/app';
import { usePushState } from '@/state/push';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

type TestState = { kind: 'idle' | 'sending' | 'success' | 'error'; message: string };

function RemoteRow({ entry }: { entry: RemoteNotification }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. Buka ${entry.locationSlug}`}
      onPress={() =>
        router.push({ pathname: '/lokasi/[slug]', params: { slug: entry.locationSlug } })
      }
      style={({ pressed }) => [styles.feedItem, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.feedDot,
          { backgroundColor: entry.status === 'sent' ? '#4abc78' : '#ef6b56' },
        ]}
      />
      <View style={styles.feedText}>
        <Text style={styles.feedItemTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.feedItemBody} numberOfLines={2}>
          {entry.body}
        </Text>
        <Text style={styles.feedItemTime}>
          {relativeTime(entry.sentAt)} · {entry.status === 'sent' ? 'terkirim' : 'gagal'}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Notification preferences, as in the design showcase — every toggle is wired
 * to the real notification store, and the push card shows whether the backend
 * actually holds a token for this device.
 */
export default function NotifikasiScreen() {
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const goBack = useBackOrHome();
  const { selected, settings } = useAppState();
  const notifications = useNotifications();
  const push = usePushState();
  const remote = useRemoteNotifications(
    backendConfigured() && push.status !== 'idle',
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: 'idle', message: '' });

  const recent = notifications.slice(0, 3);

  const runTest = async () => {
    setTest({ kind: 'sending', message: 'Mengirim…' });
    try {
      const result = await sendTestNotification();
      setTest({
        kind: result.accepted > 0 ? 'success' : 'error',
        message:
          result.accepted > 0
            ? 'Server menerima permintaan. Notifikasi muncul beberapa detik lagi.'
            : result.errors[0] ?? 'Server menolak notifikasi uji.',
      });
      void remote.reload();
    } catch (error) {
      setTest({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Gagal menghubungi server.',
      });
    }
  };

  const resync = async () => {
    setTest({ kind: 'sending', message: 'Menyinkronkan…' });
    const next = await syncPushSubscription(selected, settings);
    setTest({
      kind: next.status === 'error' ? 'error' : 'success',
      message: next.message,
    });
    void remote.reload();
  };

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
          <ArrowLeft size={20} color={colors.accent} strokeWidth={1.8} />
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
            <Trash2 size={18} color={colors.mutedText} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sections}>
        {recent.length > 0 ? (
          <Card style={styles.feed}>
            <View style={styles.feedHead}>
              <Text style={styles.feedTitle}>Terbaru di perangkat</Text>
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
                      { backgroundColor: entry.tone === 'warning' ? colors.caution : colors.accent },
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

        <Card style={styles.server}>
          <View style={styles.serverHead}>
            <View style={styles.serverIcon}>
              <Server size={19} color={colors.accent} strokeWidth={1.8} />
            </View>
            <View style={styles.serverText}>
              <Text style={styles.serverTitle}>Server & push</Text>
              <Text style={styles.serverBody}>
                {backendConfigured() ? push.message : 'Backend belum dikonfigurasi.'}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    push.status === 'connected'
                      ? '#4abc78'
                      : push.status === 'error'
                        ? '#ef6b56'
                        : colors.caution,
                },
              ]}
            />
          </View>

          <View style={styles.serverActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim notifikasi uji"
              onPress={() => void runTest()}
              disabled={test.kind === 'sending' || !backendConfigured()}
              style={({ pressed }) => [
                styles.action,
                (test.kind === 'sending' || !backendConfigured()) && styles.actionDisabled,
                pressed && styles.pressed,
              ]}
            >
              <BellRing size={16} color={colors.accent} strokeWidth={1.8} />
              <Text style={styles.actionLabel}>Uji notifikasi</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sinkron ulang ke server"
              onPress={() => void resync()}
              disabled={!backendConfigured()}
              style={({ pressed }) => [
                styles.action,
                !backendConfigured() && styles.actionDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Cloud size={16} color={colors.accent} strokeWidth={1.8} />
              <Text style={styles.actionLabel}>Sinkron ulang</Text>
            </Pressable>
          </View>

          {test.message ? (
            <Text
              style={[
                styles.testMessage,
                { color: test.kind === 'error' ? '#ef6b56' : colors.mutedText },
              ]}
            >
              {test.message}
            </Text>
          ) : null}

          {!backendConfigured() ? (
            <Text style={styles.testMessage}>
              Jalankan `awanin-server` lalu set EXPO_PUBLIC_API_URL untuk mengaktifkan push.
            </Text>
          ) : null}
        </Card>

        {remote.items.length > 0 ? (
          <Card style={styles.feed}>
            <View style={styles.feedHead}>
              <Text style={styles.feedTitle}>Dari server</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Muat ulang riwayat server"
                hitSlop={8}
                onPress={() => void remote.reload()}
              >
                <Text style={styles.feedAction}>Muat ulang</Text>
              </Pressable>
            </View>
            {remote.items.slice(0, 5).map((entry, index) => (
              <View key={entry.id}>
                {index > 0 ? <Divider /> : null}
                <RemoteRow entry={entry} />
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
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.surface}
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
            icon={<MapPin size={19} color={colors.accent} strokeWidth={1.8} />}
            label={selected.name}
            hint={selected.area}
            value="Ubah"
            onPress={() => setPickerOpen(true)}
          />
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Simpan pengaturan notifikasi"
          onPress={goBack}
          style={({ pressed }) => [styles.save, pressed && styles.savePressed]}
        >
          <Text style={styles.saveLabel}>Simpan</Text>
        </Pressable>

        <View style={styles.legendRow}>
          <Lightbulb size={13} color={colors.mutedText} strokeWidth={1.8} />
          <Text style={styles.legendText}>
            Notifikasi dalam aplikasi muncul saat aplikasi terbuka. Push dari server tetap
            dikirim walau aplikasi ditutup — asalkan token terdaftar.
          </Text>
        </View>
      </View>

      <LocationSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
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
      paddingBottom: 32,
    },
    header: {
      height: 56,
      paddingHorizontal: spacing.gutter,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    headerTitle: {
      ...typo.title,
      flex: 1,
      color: colors.ink,
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
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    feedTitle: {
      ...typo.bodyStrong,
      fontSize: 14,
      color: colors.ink,
    },
    feedAction: {
      ...typo.caption,
      color: colors.accent,
    },
    feedItem: {
      flexDirection: 'row' as const,
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
      color: colors.ink,
    },
    feedItemBody: {
      ...typo.caption,
      color: colors.mutedText,
    },
    feedItemTime: {
      ...typo.micro,
      color: colors.mutedText,
    },
    server: {
      padding: 14,
      gap: 12,
    },
    serverHead: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 11,
    },
    serverIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    serverText: {
      flex: 1,
      gap: 2,
    },
    serverTitle: {
      ...typo.bodyStrong,
      fontSize: 14,
      color: colors.ink,
    },
    serverBody: {
      ...typo.caption,
      color: colors.mutedText,
    },
    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    serverActions: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    action: {
      flex: 1,
      height: 40,
      borderRadius: radius.control,
      backgroundColor: colors.tint,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
    },
    actionDisabled: {
      opacity: 0.45,
    },
    actionLabel: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.accent,
    },
    testMessage: {
      ...typo.caption,
      color: colors.mutedText,
    },
    master: {
      padding: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    masterText: {
      flex: 1,
      gap: 3,
    },
    masterTitle: {
      ...typo.bodyStrong,
      fontSize: 14,
      color: colors.ink,
    },
    masterBody: {
      ...typo.caption,
      color: colors.mutedText,
    },
    sectionLabel: {
      ...typo.caption,
      fontFamily: font.bold,
      color: colors.mutedText,
      marginTop: 4,
      marginLeft: 4,
    },
    group: {
      paddingHorizontal: 4,
    },
    save: {
      height: 52,
      borderRadius: radius.card,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 8,
    },
    savePressed: {
      opacity: 0.85,
    },
    saveLabel: {
      ...typo.bodyStrong,
      fontSize: 15,
      color: colors.onAccent,
    },
    legendRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      justifyContent: 'center' as const,
      marginTop: 2,
    },
    legendText: {
      ...typo.micro,
      color: colors.mutedText,
      flexShrink: 1,
    },
  };
}
