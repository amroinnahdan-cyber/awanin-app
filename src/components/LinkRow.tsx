import { Pressable, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { type as typo, type ThemeColors } from '@/theme/tokens';

/** One-line navigation row for the text screens. */
export function LinkRow({ label, href }: { label: string; href: Href }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <ChevronRight size={16} color={colors.muted} strokeWidth={1.8} />
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return {
    row: {
      minHeight: 40,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      ...typo.body,
      color: colors.accent,
    },
  };
}
