import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { BatteryFull, Signal, Wifi } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, spacing, type ThemeColors } from '@/theme/tokens';

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
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.icons}>
        <Signal size={18} color={colors.ink} strokeWidth={2} />
        <Wifi size={18} color={colors.ink} strokeWidth={2} />
        <BatteryFull size={24} color={colors.ink} strokeWidth={2} />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    bar: {
      height: 44,
      paddingHorizontal: spacing.statusGutter,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    time: {
      fontFamily: font.bold,
      fontSize: 15,
      lineHeight: 21,
      color: colors.ink,
    },
    icons: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
    },
  };
}
