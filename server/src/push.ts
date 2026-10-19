import type { Logger } from 'pino';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
};

export type PushResult = {
  ok: number;
  failed: number;
  errors: string[];
};

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushResult>;
}

export function isValidExpoPushToken(token: string): boolean {
  return EXPO_TOKEN_PATTERN.test(token);
}

type ExpoTicket = { status?: string; message?: string; details?: { error?: string } };

/**
 * Expo Push API sender.
 *
 * Messages are chunked at 100 (Expo's limit). A ticket that comes back with
 * `status: "error"` is reported as a failure so the scheduler can record it
 * instead of silently losing the alert.
 */
export function createExpoPushSender(
  accessToken: string | undefined,
  logger: Pick<Logger, 'warn' | 'error'>,
): PushSender {
  return {
    async send(messages: PushMessage[]): Promise<PushResult> {
      const valid = messages.filter((message) => isValidExpoPushToken(message.to));
      const result: PushResult = {
        ok: 0,
        failed: messages.length - valid.length,
        errors: valid.length === messages.length ? [] : ['Token push tidak valid'],
      };
      if (valid.length === 0) return result;

      for (let index = 0; index < valid.length; index += 100) {
        const chunk = valid.slice(index, index + 100);
        try {
          const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'accept-encoding': 'gzip, deflate',
              'content-type': 'application/json',
              ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(chunk),
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) {
            const text = await response.text();
            result.failed += chunk.length;
            result.errors.push(`Expo HTTP ${response.status}: ${text.slice(0, 200)}`);
            logger.error({ status: response.status }, 'Expo push request failed');
            continue;
          }
          const payload = (await response.json()) as { data?: ExpoTicket[] };
          const tickets = Array.isArray(payload.data) ? payload.data : [];
          for (const ticket of tickets) {
            if (ticket.status === 'error') {
              result.failed += 1;
              result.errors.push(ticket.message ?? ticket.details?.error ?? 'Unknown push error');
            } else {
              result.ok += 1;
            }
          }
        } catch (error) {
          result.failed += chunk.length;
          result.errors.push(error instanceof Error ? error.message : 'Push request failed');
          logger.error({ error }, 'Expo push request threw');
        }
      }

      return result;
    },
  };
}
