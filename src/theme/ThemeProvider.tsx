import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { updateSettings, useAppState, type ThemeMode } from '@/state/app';
import { darkColors, lightColors, type ThemeColors } from '@/theme/tokens';

type ThemeValue = {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  scheme: 'light',
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppState();
  const system = useColorScheme();
  const mode = settings.themeMode;
  const scheme: 'light' | 'dark' =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const setMode = useCallback((next: ThemeMode) => updateSettings({ themeMode: next }), []);

  const value = useMemo<ThemeValue>(
    () => ({ colors, scheme, mode, setMode }),
    [colors, scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/**
 * Builds a style object once per palette and memoises it for the component.
 * Usage: `const styles = useThemedStyles(createStyles)` with a module-level
 * `createStyles(colors)` factory — the factory identity is stable, so the
 * memo only recomputes when the palette actually flips.
 *
 * Plain objects (rather than StyleSheet.create) keep the generic inference:
 * each property keeps its own type, so `styles.screen` is still a ViewStyle.
 */
export function useThemedStyles<
  T extends Record<string, ViewStyle | TextStyle | ImageStyle>,
>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
