import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bell, MapPin, Wind } from 'lucide-react-native';

import { useGeolocation } from '@/hooks/useGeolocation';
import { registerForPush } from '@/lib/push';
import { updateSettings } from '@/state/app';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, radius, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

type Step = {
  key: string;
  icon: typeof Wind;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    key: 'intro',
    icon: Wind,
    title: 'Udara Jakarta, tanpa menebak',
    body: 'AQI terkini, prakiraan tujuh hari, dan riwayat dari Open-Meteo — semua di satu tempat.',
  },
  {
    key: 'notify',
    icon: Bell,
    title: 'Ketahui saat udara memburuk',
    body: 'Server Awanin memeriksa kualitas udara tiap 15 menit dan mengirim peringatan walau aplikasi ditutup.',
  },
  {
    key: 'location',
    icon: MapPin,
    title: 'Pantau titikmu sendiri',
    body: 'Pilih Monas, Bundaran HI, GBK, atau Kota Tua — atau izinkan Awanin membaca lokasi perangkat.',
  },
];

/**
 * First-run overlay. Permissions are requested here with context, not on a cold
 * start, and every step can be skipped: the app remains fully usable without
 * either permission (push just falls back to the in-app feed).
 */
export function Onboarding() {
  const [step, setStep] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { locating, error: locateError, locate } = useGeolocation();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  const finish = () => updateSettings({ onboarded: true });

  const allowNotifications = async () => {
    setBusy(true);
    setNote(null);
    const result = await registerForPush();
    setNote(
      result.token
        ? 'Notifikasi diizinkan. Server akan mengirim peringatan AQI.'
        : result.reason ?? 'Notifikasi belum bisa diaktifkan.',
    );
    setBusy(false);
  };

  /**
   * Asking for the permission alone used to end the step with an instruction
   * ("pilih Gunakan lokasi saya di daftar lokasi"), so tapping "Izinkan lokasi"
   * changed nothing and the app kept showing Jakarta Pusat. Going through the
   * shared hook reads the fix and selects it, so the step does what its label
   * promises; a failure shows the hook's own message (permission denied, services
   * off, no fix in 12 s) instead of a sentence that hides the reason.
   */
  const allowLocation = async () => {
    setNote(null);
    const done = await locate();
    if (done) setNote('Lokasi perangkat aktif. Awanin membaca udara di tempatmu.');
  };

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.brand}>awanin</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lewati onboarding"
          hitSlop={10}
          onPress={finish}
        >
          <Text style={styles.skip}>Lewati</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Icon size={34} color={colors.accent} strokeWidth={1.7} />
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        {step === 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Izinkan notifikasi"
            onPress={() => void allowNotifications()}
            disabled={busy}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>
              {busy ? 'Meminta izin…' : 'Izinkan notifikasi'}
            </Text>
          </Pressable>
        ) : null}

        {step === 2 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Izinkan lokasi"
            onPress={() => void allowLocation()}
            disabled={locating}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>
              {locating ? 'Mendeteksi lokasi…' : 'Izinkan lokasi'}
            </Text>
          </Pressable>
        ) : null}

        {note || locateError ? (
          <Text style={styles.note}>{note ?? locateError}</Text>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {STEPS.map((entry, index) => (
            <View
              key={entry.key}
              style={[styles.dot, index === step && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={last ? 'Mulai memakai Awanin' : 'Lanjut'}
          onPress={() => (last ? finish() : setStep((value) => value + 1))}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryLabel}>{last ? 'Mulai' : 'Lanjut'}</Text>
        </Pressable>
        <Text style={styles.footnote}>
          Data Open-Meteo, bukan pengganti nasihat medis. Tidak ada akun atau data pribadi.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    root: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.gutter + 4,
      paddingTop: 56,
      paddingBottom: 36,
      justifyContent: 'space-between' as const,
    },
    top: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    brand: {
      fontFamily: font.extrabold,
      fontSize: 21,
      lineHeight: 26,
      color: colors.accent,
      letterSpacing: -0.5,
    },
    skip: {
      ...typo.bodyStrong,
      color: colors.mutedText,
    },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 12,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: radius.pill,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 6,
    },
    title: {
      ...typo.title,
      fontSize: 23,
      lineHeight: 30,
      color: colors.ink,
      textAlign: 'center' as const,
      maxWidth: 300,
    },
    body: {
      ...typo.body,
      color: colors.mutedText,
      textAlign: 'center' as const,
      maxWidth: 310,
      lineHeight: 20,
    },
    secondary: {
      marginTop: 14,
      height: 44,
      paddingHorizontal: 18,
      borderRadius: radius.control,
      backgroundColor: colors.tint,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    secondaryLabel: {
      ...typo.bodyStrong,
      color: colors.accent,
    },
    note: {
      ...typo.caption,
      color: colors.mutedText,
      textAlign: 'center' as const,
      maxWidth: 310,
    },
    bottom: {
      gap: 14,
    },
    dots: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 7,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      width: 20,
      backgroundColor: colors.accent,
    },
    primary: {
      height: 52,
      borderRadius: radius.card,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    primaryLabel: {
      ...typo.bodyStrong,
      fontSize: 15,
      color: colors.onAccent,
    },
    pressed: {
      opacity: 0.8,
    },
    footnote: {
      ...typo.micro,
      color: colors.mutedText,
      textAlign: 'center' as const,
    },
  };
}
