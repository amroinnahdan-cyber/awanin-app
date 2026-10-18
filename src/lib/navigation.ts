import { useCallback } from 'react';
import { router, useNavigation, type Href } from 'expo-router';

/**
 * Back handler for sub-screens.
 *
 * `router.canGoBack()` is unreliable when a screen is opened directly by URL /
 * deep link: it reports true (browser history exists) while `router.back()` is a
 * no-op, so the button appears dead. The navigation stack is the source of truth:
 * index 0 means this route is the only entry, so go to a known parent instead.
 */
export function useBackOrHome(fallback: Href = '/') {
  const navigation = useNavigation();

  return useCallback(() => {
    const state = navigation.getState();
    if (typeof state?.index === 'number' && state.index > 0) {
      navigation.goBack();
      return;
    }
    router.replace(fallback);
  }, [navigation, fallback]);
}