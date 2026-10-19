import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Tabs, router, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChartNoAxesCombined,
  House,
  Map,
  UserRound,
  type LucideProps,
} from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, spacing, type ThemeColors } from '@/theme/tokens';

type IconProps = Pick<LucideProps, 'size' | 'color'>;

const TAB_ICONS: Record<string, (props: IconProps) => ReactNode> = {
  index: ({ size, color }) => <House size={size} color={color} strokeWidth={2} />,
  peta: ({ size, color }) => <Map size={size} color={color} strokeWidth={2} />,
  riwayat: ({ size, color }) => (
    <ChartNoAxesCombined size={size} color={color} strokeWidth={2} />
  ),
  profil: ({ size, color }) => <UserRound size={size} color={color} strokeWidth={2} />,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Beranda',
  peta: 'Peta',
  riwayat: 'Riwayat',
  profil: 'Profil',
};

const TAB_HREFS: Record<string, Href> = {
  index: '/',
  peta: '/peta',
  riwayat: '/riwayat',
  profil: '/profil',
};

/**
 * Figma "Navigasi utama" (2027:8218): 82 tall = 12 top + 41 item + 18 gap
 * + 4 home indicator + 7 bottom. Labels are 10/14 regular, 4px under the icon.
 *
 * Focus comes from the pathname and taps go through the router: the `tabBar`
 * render prop does not receive a `navigation` object, so calling
 * `navigation.emit('tabPress')` threw "Cannot read properties of undefined".
 */
function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isWeb = Platform.OS === 'web';
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <View style={[styles.bar, { paddingBottom: isWeb ? 7 : Math.max(insets.bottom, 8) }]}>
      <View style={styles.items}>
        {Object.keys(TAB_LABELS).map((name) => {
          const href = TAB_HREFS[name];
          const focused = pathname === href;
          const tint = focused ? colors.accent : colors.mutedText;
          const Icon = TAB_ICONS[name];
          const label = TAB_LABELS[name];

          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                if (!focused) router.navigate(href);
              }}
              style={styles.item}
            >
              <Icon size={23} color={tint} />
              <Text style={[styles.label, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isWeb ? <View style={styles.homeIndicator} /> : null}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />}>
      {Object.keys(TAB_LABELS).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: TAB_LABELS[name] }} />
      ))}
    </Tabs>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    bar: {
      paddingTop: spacing.navPaddingTop,
      paddingHorizontal: spacing.navPaddingHorizontal,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center' as const,
    },
    items: {
      alignSelf: 'stretch' as const,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
    },
    item: {
      width: 70,
      minHeight: 41,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      gap: 4,
    },
    label: {
      fontFamily: font.regular,
      fontSize: 10,
      lineHeight: 14,
    },
    homeIndicator: {
      width: 116,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.ink,
      marginTop: 18,
    },
  };
}
