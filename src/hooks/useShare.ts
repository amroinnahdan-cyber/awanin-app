import { useCallback, useEffect, useState } from 'react';

import { shareText } from '@/lib/share';

export type ShareFeedback = 'idle' | 'copied' | 'failed';

/**
 * Share with a short-lived result, so a tap always ends in visible feedback.
 *
 * A successful native share sheet needs no confirmation (the sheet itself is the
 * feedback); a clipboard copy and a failure do, otherwise the button looks dead.
 */
export function useShare() {
  const [state, setState] = useState<ShareFeedback>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const share = useCallback(async (message: string, title?: string) => {
    const outcome = await shareText(message, title);
    setState(outcome === 'shared' ? 'idle' : outcome);
  }, []);

  return { state, share };
}
