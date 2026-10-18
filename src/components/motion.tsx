import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Entrance for a block: fades in while sliding up a few pixels.
 *
 * `useNativeDriver` is off on web on purpose — react-native-web ignores the flag
 * but warns about it, and the JS driver renders the same result at 60fps.
 */
export function FadeIn({
  children,
  delay = 0,
  offset = 10,
  duration = 420,
  style,
}: {
  children: ReactNode;
  delay?: number;
  offset?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();

    // A background tab throttles requestAnimationFrame (the driver's clock) to a
    // standstill, which would leave the block invisible. Land on the end state
    // with a timer as well; a finished animation makes this a no-op.
    const settle = setTimeout(() => progress.setValue(1), delay + duration + 250);

    return () => {
      animation.stop();
      clearTimeout(settle);
    };
  }, [delay, duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Animates a number towards its target, so a fresh reading counts up instead of
 * snapping. Returns the number to render right now.
 */
export function useCountUp(value: number, duration = 700): number {
  const [display, setDisplay] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    // Nothing to animate: same value as last run, or not a usable number.
    if (!Number.isFinite(value) || value === from.current) return;

    const start = from.current;
    const delta = value - start;
    const startedAt = Date.now();
    let frame = 0;

    const tick = () => {
      const t = Math.min((Date.now() - startedAt) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };

    frame = requestAnimationFrame(tick);

    // Same safety net as FadeIn: if frames never arrive, show the real number
    // instead of leaving a count-up frozen at its starting point.
    const settle = setTimeout(() => {
      setDisplay(value);
      from.current = value;
    }, duration + 400);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [value, duration]);

  return display;
}
