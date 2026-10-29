import { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Inter_400Regular, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';

import { Onboarding } from '@/components/Onboarding';
import { SplashScreen } from '@/components/SplashScreen';
import { useGeolocation } from '@/hooks/useGeolocation';
import { attachNotificationNavigation } from '@/lib/push';
import { syncPushSubscription } from '@/lib/subscription';
import { hydrateAppState, useAppState } from '@/state/app';
import { hydrateNotifications } from '@/state/notifications';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { darkColors, lightColors } from '@/theme/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) console.warn('Gagal memuat Inter, memakai font sistem.', fontError);
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootShell() {
  const { colors, scheme } = useTheme();
  const { settings, selected } = useAppState();
  const { locateSilently } = useGeolocation();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  // Restore persisted state (settings, favourites, notification history) while
  // the splash is up. The splash has a minimum duration, so this rarely delays
  // first paint — and never blocks it.
  useEffect(() => {
    let alive = true;
    void Promise.all([hydrateAppState(), hydrateNotifications()]).finally(() => {
      if (alive) setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // After onboarding is done, one quiet read moves the home screen onto the
  // device when the user never picked a place by hand. No prompt, no error
  // UI: if permission is missing or the fix stalls, the current place stays.
  useEffect(() => {
    if (!hydrated || !settings.onboarded) return;
    void locateSilently();
  }, [hydrated, settings.onboarded, locateSilently]);

  // Mirror notification settings into the backend. Debounced because settings
  // and the selected location are changed from several sheets.
  useEffect(() => {
    if (!hydrated || !settings.onboarded) return;
    const timer = setTimeout(() => {
      void syncPushSubscription(selected, settings);
    }, 700);
    return () => clearTimeout(timer);
  }, [hydrated, selected, settings]);

  // A tapped push opens the location it is about.
  useEffect(
    () =>
      attachNotificationNavigation((slug) => {
        router.push({ pathname: '/lokasi/[slug]', params: { slug } });
      }),
    [router],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifikasi" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tips" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tentang" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bantuan" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privasi" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="lokasi/[slug]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      {splashVisible ? (
        <SplashScreen onDone={() => setSplashVisible(false)} duration={1100} />
      ) : null}
      {!splashVisible && hydrated && !settings.onboarded ? <Onboarding /> : null}
    </View>
  );
}

/**
 * Route-level crash guard. Expo Router renders this in place of the failing
 * screen; it deliberately uses the palette directly (no ThemeProvider needed).
 */
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        padding: 24,
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>
        Ada yang tidak beres
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedText }}>
        Layar ini gagal ditampilkan. Data yang sudah tersimpan tetap aman.
      </Text>
      <Text style={{ fontSize: 11, color: colors.mutedText }}>{error.message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Coba lagi"
        onPress={() => void retry()}
        style={{
          marginTop: 8,
          alignSelf: 'flex-start',
          paddingHorizontal: 16,
          height: 42,
          borderRadius: 10,
          backgroundColor: colors.accent,
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 13 }}>
          Coba lagi
        </Text>
      </Pressable>
    </View>
  );
}
