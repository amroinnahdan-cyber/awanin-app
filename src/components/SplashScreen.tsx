import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTopInset } from '@/hooks/useTopInset';
import { color, font, type as typo } from '@/theme/tokens';

type Props = {
  /** Called once the fade-out finishes. */
  onDone: () => void;
  /** Minimum time the splash stays visible. */
  duration?: number;
};

/**
 * Splash: full-bleed sky illustration with the cloud glyph centred and the
 * wordmark + slogan parked low, as in the design showcase. Tap-to-continue and
 * a 300ms ease-out fade, mirroring the Figma prototype.
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
    <Animated.View style={[styles.root, { opacity }]}>
      <ImageBackground
        source={require('../../assets/img-splash.jpg')}
        style={styles.art}
        resizeMode="cover"
      >
        <View style={[styles.center, { paddingTop: topInset }]}>
          <Image
            source={require('../../assets/logo-mark.png')}
            style={styles.glyph}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <Pressable
          style={styles.footer}
          accessibilityRole="button"
          accessibilityLabel="Awanin, ketuk untuk mulai"
          onPress={finish}
        >
          <Text style={styles.wordmark}>awanin</Text>
          <Text style={styles.tagline}>Know Your Air</Text>
        </Pressable>
      </ImageBackground>
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
    zIndex: 10,
    elevation: 10,
    backgroundColor: color.sky,
  },
  art: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  glyph: {
    width: 168,
    height: 168,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 76,
    gap: 6,
  },
  wordmark: {
    fontFamily: font.extrabold,
    fontSize: 40,
    lineHeight: 48,
    color: color.accent,
    letterSpacing: -1,
  },
  tagline: {
    ...typo.heading,
    color: color.ink,
  },
});
