import { Linking, Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Share text, falling back to the clipboard where there is no share target.
 *
 * `react-native-web` rejects `Share.share` with "Share is not supported in this
 * browser" whenever `navigator.share` is missing — which is every desktop
 * browser. Call sites used `void Share.share(...)`, so that rejection escaped as
 * an unhandled exception and the button silently did nothing. Here the copy is
 * the fallback, and the outcome lets the caller confirm what happened.
 */
export async function shareText(message: string, title?: string): Promise<ShareOutcome> {
  try {
    await Share.share(title ? { message, title } : { message });
    return 'shared';
  } catch {
    // No share target — try the clipboard below.
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(message);
      return 'copied';
    } catch {
      // Clipboard writes can be blocked outside a user gesture.
    }
  }

  return 'failed';
}

/**
 * Opens an external URL. `Linking.openURL` rejects when the platform has no
 * handler for the scheme (and on web when the popup is blocked); that must not
 * surface as an unhandled rejection from a tap.
 */
export async function openUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing actionable: the caller has no UI for "no browser installed".
  }
}
