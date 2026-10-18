import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { Inter_400Regular, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';

import { SplashScreen } from '@/components/SplashScreen';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [splashVisible, setSplashVisible] = useState(true);
  const hideSplash = useCallback(() => setSplashVisible(false), []);

  useEffect(() => {
    if (fontError) console.warn('Gagal memuat Inter, memakai font sistem.', fontError);
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifikasi" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tips" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tentang" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="bantuan" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="privasi" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="lokasi/[slug]" options={{ animation: 'slide_from_right' }} />
        </Stack>
        {splashVisible ? <SplashScreen onDone={hideSplash} duration={1100} /> : null}
      </View>
    </SafeAreaProvider>
  );
}