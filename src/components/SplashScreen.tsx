import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useTopInset } from '@/hooks/useTopInset';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { font, shadow, spacing, type as typo, type ThemeColors } from '@/theme/tokens';

type Props = {
  /** Called once the fade-out finishes. */
  onDone: () => void;
  /** Minimum time the splash stays visible. */
  duration?: number;
};

const LIGHT_SKY = ['#f6fbff', '#dcedff', '#eaf4ff'] as const;
const DARK_SKY = ['#0b2038', '#0d1420'] as const;

/**
 * Splash Screen (Figma node 2027:8125).
 *
 * The first version stacked the raster lock-up (glyph + wordmark baked into one
 * blue image) on `colors.sky`. In dark mode that sky is #16324f, so the blue
 * lock-up sat on navy at roughly 3:1 — the screenshot that prompted this
 * redesign. Blue is the brand, so instead of recolouring the asset the glyph now
 * sits in a light "app icon" tile that keeps it crisp on both themes, and the
 * wordmark is set in Inter (the same treatment as the Beranda header) so it can
 * follow the theme's accent colour.
 */
export function SplashScreen({ onDone, duration = 1100 }: Props) {
  const [opacity] = useState(() => new Animated.Value(1));
  const topInset = useTopInset();
  const styles = useThemedStyles(createStyles);
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  // Gradient ids are document-global on web, so keep them unique per instance.
  const glowId = `splash-glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const finished = useRef(false);

  // `onDone` is an inline arrow at the call site, so keeping it in the callback
  // deps made `finish` a new function on every parent render — and every such
  // render re-armed the timeout below. Hydration, the push sync and each new
  // reading all re-render the root, which could hold the splash for tens of
  // seconds. The ref keeps `finish` stable so the timer is armed exactly once.
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => onDoneRef.current());
  }, [opacity]);

  useEffect(() => {
    const timer = setTimeout(finish, duration);
    return () => clearTimeout(timer);
  }, [duration, finish]);

  return (
    <Animated.View style={[styles.root, { opacity, paddingTop: topInset }]}>
      <LinearGradient
        colors={dark ? DARK_SKY : LIGHT_SKY}
        locations={dark ? [0, 1] : [0, 0.58, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft light behind the logo, so the centre does not read as a flat fill. */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id={glowId} cx="0.5" cy="0.42" r="0.5">
            <Stop
              offset="0"
              stopColor={dark ? '#6aa6ff' : '#ffffff'}
              stopOpacity={dark ? 0.2 : 0.9}
            />
            <Stop
              offset="0.55"
              stopColor={dark ? '#6aa6ff' : '#ffffff'}
              stopOpacity={dark ? 0.07 : 0.4}
            />
            <Stop
              offset="1"
              stopColor={dark ? '#6aa6ff' : '#ffffff'}
              stopOpacity="0"
            />
          </RadialGradient>
        </Defs>
        <Ellipse cx={50} cy={44} rx={64} ry={44} fill={`url(#${glowId})`} />
      </Svg>

      <Pressable
        style={styles.center}
        accessibilityRole="button"
        accessibilityLabel="Awanin — Know Your Air. Ketuk untuk mulai"
        onPress={finish}
      >
        <View style={[styles.tile, dark ? styles.tileDark : styles.tileLight]}>
          <Image
            source={require('../../assets/logo-mark.png')}
            style={styles.mark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <Text style={styles.wordmark}>awanin</Text>
        <Text style={styles.tagline}>Know Your Air</Text>
      </Pressable>
    </Animated.View>
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
      backgroundColor: colors.bg,
      overflow: 'hidden' as const,
      zIndex: 10,
    },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.gutter,
      // Optical centre: a hair above true centre reads calmer than dead-centre.
      paddingBottom: 36,
    },
    tile: {
      width: 132,
      height: 132,
      borderRadius: 38,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...shadow,
    },
    tileLight: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: 'rgba(24, 84, 200, 0.06)',
    },
    tileDark: {
      backgroundColor: '#e9f3ff',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.55)',
    },
    mark: {
      width: 86,
      height: 86,
    },
    wordmark: {
      fontFamily: font.extrabold,
      fontSize: 34,
      lineHeight: 41,
      letterSpacing: -1.3,
      color: colors.accent,
      marginTop: 24,
    },
    tagline: {
      ...typo.caption,
      letterSpacing: 2.2,
      color: colors.mutedText,
      marginTop: 7,
      textAlign: 'center' as const,
    },
  };
}
