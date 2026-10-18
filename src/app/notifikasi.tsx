import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, BellOff } from 'lucide-react-native';

import { DeviceStatusBar } from '@/components/DeviceStatusBar';
import { Card } from '@/components/ui';
import { useTopInset } from '@/hooks/useTopInset';
import { locationSlug } from '@/api/openMeteo';
import { useBackOrHome } from '@/lib/navigation';
import {
  clearNotificationCache,
  markAllRead,
  markRead,
  useNotifications,
} from '@/state/notifications';
import { color, font, radius, spacing, type as typo } from '@/theme/tokens';

export default function NotifikasiScreen() {
  const topInset = useTopInset();
  const goBack = useBackOrHome();
  const notifications = useNotifications();
  const unread = notifications.filter((entry) => !entry.read).length;

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
        >
          <ArrowLeft size={20} color={color.accent} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        {notifications.length > 0 ? (
          <View style={styles.headerActions}>
            {unread > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tandai semua dibaca"
                hitSlop={8}
                onPress={markAllRead}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Text style={styles.headerAction}>Tandai dibaca</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bersihkan semua notifikasi"
              hitSlop={8}
              onPress={clearNotificationCache}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.headerAction}>Bersihkan</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.sections}>
        {notifications.length === 0 ? (
          <Card style={styles.empty}>
            <View style={styles.emptyIcon}>
              <BellOff size={28} color={color.accent} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada notifikasi</Text>
            <Text style={styles.emptyBody}>
              Kami akan mengabari di sini saat kategori kualitas udara berubah — misalnya dari
              Sedang menjadi Tidak Sehat.
            </Text>
            <Text style={styles.emptyHint}>
              Pembacaan diperbarui setiap kali kamu menarik layar Beranda ke bawah.
            </Text>
          </Card>
        ) : (
          notifications.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`${entry.title}. Buka ${entry.place}`}
              accessibilityState={{ selected: !entry.read }}
              onPress={() => {
                markRead(entry.id);
                router.push({
                  pathname: '/lokasi/[slug]',
                  params: { slug: locationSlug(entry.place) },
                });
              }}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={[styles.item, !entry.read && styles.itemUnread]}>
                <View style={styles.itemHead}>
                  <View
                    style={[
                      styles.dot,
                      !entry.read && styles.dotUnread,
                      { backgroundColor: entry.tone === 'warning' ? color.caution : color.good },
                    ]}
                  />
                  <Text style={styles.itemTitle}>{entry.title}</Text>
                </View>
                <Text style={styles.itemBody}>{entry.body}</Text>
                <View style={styles.itemFoot}>
                  <Text style={styles.itemPlace}>{entry.place}</Text>
                  <Text style={styles.itemTime}>{entry.time}</Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    ...typo.title,
    flex: 1,
    color: color.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerAction: {
    ...typo.caption,
    fontFamily: font.bold,
    color: color.accent,
  },
  pressed: {
    opacity: 0.6,
  },
  itemUnread: {
    borderWidth: 1,
    borderColor: color.track,
  },
  dotUnread: {
    width: 8,
    height: 8,
  },
  itemFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemPlace: {
    ...typo.micro,
    color: color.mutedText,
  },
  sections: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.section,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: color.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...typo.heading,
    color: color.ink,
    textAlign: 'center',
  },
  emptyBody: {
    ...typo.body,
    color: color.mutedText,
    textAlign: 'center',
  },
  emptyHint: {
    ...typo.micro,
    color: color.mutedText,
    textAlign: 'center',
  },
  item: {
    padding: 14,
    gap: 6,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    ...typo.bodyStrong,
    flex: 1,
    color: color.ink,
  },
  itemBody: {
    ...typo.body,
    color: color.mutedText,
  },
  itemTime: {
    ...typo.micro,
    color: color.mutedText,
  },
});