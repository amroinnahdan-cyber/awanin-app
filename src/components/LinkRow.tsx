import { Pressable, StyleSheet, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { color, type as typo } from '@/theme/tokens';

/** One-line navigation row for the text screens. */
export function LinkRow({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <ChevronRight size={16} color={color.muted} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...typo.body,
    color: color.accent,
  },
});
