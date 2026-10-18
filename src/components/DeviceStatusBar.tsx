import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { BatteryFull, Signal, Wifi } from 'lucide-react-native';

import { color, font, spacing } from '@/theme/tokens';

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * The Figma frames include a 44px status bar ("9:41" + signal/wifi/battery).
 * On device the OS draws it, so we only render it where no system bar exists (web).
 */
export function DeviceStatusBar() {
  const time = useClock();

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.icons}>
        <Signal size={18} color={color.ink} strokeWidth={2} />
        <Wifi size={18} color={color.ink} strokeWidth={2} />
        <BatteryFull size={24} color={color.ink} strokeWidth={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: spacing.statusGutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: font.bold,
    fontSize: 15,
    lineHeight: 21,
    color: color.ink,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});