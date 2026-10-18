import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top offset for the decorative status-bar row: on web we draw our own 44px bar
 * (matching the Figma frame), on device the system bar sits there already so the
 * offset comes from the safe-area inset instead.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return 0;
  return insets.top;
}