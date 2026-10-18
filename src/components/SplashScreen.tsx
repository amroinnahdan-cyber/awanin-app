import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTopInset } from '@/hooks/useTopInset';
import { color, spacing, type as typo } from '@/theme/tokens';

type Props = {
  /** Called once the fade-out finishes. */
  onDone: () => void;
  /** Minimum time the splash stays visible. */
  duration?: number;
};

/**
 * Splash Screen (Figma node 2027:8125): background #d9eeff, tap-to-continue in the
 * prototype, 300ms ease-out transition to Beranda — mirrored here with Animated.
 * The file exposes only the frame and its prototype link, so the wordmark,
 * tagline and cloud glyph are my additions.
 */
export function SplashScreen({ onDone, duration = 1100 }: Props) {
  const [opacity] = useState(() => new Animated.Value(1));
  const topInset = useTopInset();

  const finish = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => onDone());
  }, [opacity, onDone]);

  useEffect(() => {
    const timer = setTimeout(finish, duration);
    return () => clearTimeout(timer);
  }, [duration, finish]);

  return (
    <Animated.View style={[styles.root, { opacity, paddingTop: topInset }]}>
      <Pressable
        style={styles.center}
        accessibilityRole="button"
        accessibilityLabel="Awanin, ketuk untuk mulai"
        onPress={finish}
      >
        <Image
          source={require('../../assets/logo-lockup.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.tagline}>Kualitas udara Jakarta, setiap saat</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.sky,
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: spacing.gutter,
  },
  logo: {
    width: 300,
    height: 226,
  },
  tagline: {
    ...typo.body,
    color: color.mutedText,
    textAlign: 'center',
  },
});