import type { DayAqi } from '@/api/openMeteo';
import { categoryFor, indexUnit, shortDate, type IndexScale } from '@/lib/aqi';
import { loadPersisted, savePersisted } from '@/lib/persist';
import {
  cancelMorningReminders,
  scheduleMorningReminders,
  type ReminderEntry,
} from '@/lib/push';

/**
 * Morning reminder: the one notification Awanin can deliver while the app is
 * closed without a server.
 *
 * The feed in `state/notifications` is event-driven — it only speaks when the app
 * reads data, so it cannot wake anyone up. This module turns the forecast that a
 * reading already carries into dated notifications that Android schedules and
 * delivers on its own. No Firebase, no token, no backend.
 *
 * Trade-off kept explicit in the UI: the body is a snapshot of the forecast at
 * queue time, and the queue is rebuilt every time the app opens. If the app is
 * never opened, the last three days run out and the reminder goes quiet.
 */

/** Hours a user can pick (24h). Morning only: a 15:00 "pagi" is not a nudge. */
export const REMINDER_HOURS = [5, 6, 7, 8, 9];

/** Days kept queued ahead. iOS caps pending notifications at 64; three is plenty. */
export const REMINDER_DAYS = 3;

/** How stale a queued time may be before it is dropped instead of scheduled. */
const GRACE_MS = 30_000;

const REMINDER_STORE = 'reminder';

export type ReminderPlan = {
  enabled: boolean;
  /** Hour of day in the location's own zone, 24h */
  hour: number;
  place: string;
  slug: string;
  timezone: string;
  scale: IndexScale;
  forecast: DayAqi[];
  /** Injectable clock, so the planner is testable without faking timers */
  now?: number;
};

type SavedReminder = {
  signature?: string;
  dates?: string[];
  scheduledAt?: string;
};

export function clampReminderHour(hour: number): number {
  const rounded = Math.round(hour);
  if (!Number.isFinite(rounded)) return 6;
  return Math.min(REMINDER_HOURS[REMINDER_HOURS.length - 1], Math.max(REMINDER_HOURS[0], rounded));
}

/** `6` -> `06.00`, the label used in both settings screens. */
export function reminderLabel(hour: number): string {
  return `${String(clampReminderHour(hour)).padStart(2, '0')}.00`;
}

/**
 * Offset of `timezone` at `epoch`, in milliseconds east of UTC.
 *
 * Done with `Intl` rather than a fixed +07:00: the app covers WIB, WITA, and WIT,
 * and a Jakarta-checked reminder must still ring at 06.00 in Jayapura.
 */
function zoneOffsetMs(epoch: number, timezone: string): number {
  try {
    const parts: Record<string, string> = {};
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    for (const part of formatter.formatToParts(new Date(epoch))) parts[part.type] = part.value;
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second),
    );
    return asUtc - epoch;
  } catch {
    // Unknown zone name: fall back to treating the wall clock as UTC rather
    // than throwing away the reminder entirely.
    return 0;
  }
}

/** Epoch ms for `hour:00` on `day` (`YYYY-MM-DD`) in `timezone`. */
export function zonedReminderTime(day: string, hour: number, timezone: string): number {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return Number.NaN;
  const naive = Date.UTC(year, month - 1, date, clampReminderHour(hour), 0, 0);
  return naive - zoneOffsetMs(naive, timezone);
}

/**
 * Forecast days -> queued notifications, oldest pending day first.
 *
 * A day whose hour has already passed is skipped: `DATE` triggers in the past
 * either fire immediately or silently never, and neither is a reminder.
 */
export function buildReminderEntries(plan: ReminderPlan): ReminderEntry[] {
  if (!plan.enabled) return [];
  const now = plan.now ?? Date.now();
  const hour = clampReminderHour(plan.hour);
  const unit = indexUnit(plan.scale);
  const days = plan.forecast
    .filter((day) => typeof day?.day === 'string' && day.day.length === 10)
    .sort((a, b) => a.day.localeCompare(b.day));

  const entries: ReminderEntry[] = [];
  for (const day of days) {
    if (entries.length >= REMINDER_DAYS) break;
    const at = zonedReminderTime(day.day, hour, plan.timezone);
    if (!Number.isFinite(at) || at <= now + GRACE_MS) continue;
    const value = Math.round(day.avg);
    const category = categoryFor(value, plan.scale);
    entries.push({
      date: day.day,
      at,
      title: `Selamat pagi · ${plan.place}`,
      body: `${unit} prakiraan ${shortDate(day.day)}: ${value} (${category.short}). ${category.message}`,
      slug: plan.slug,
    });
  }
  return entries;
}

function signatureOf(plan: ReminderPlan, entries: ReminderEntry[]): string {
  return JSON.stringify({
    hour: clampReminderHour(plan.hour),
    place: plan.place,
    slug: plan.slug,
    scale: plan.scale,
    entries: entries.map((entry) => [entry.date, entry.at, entry.body]),
  });
}

/**
 * Reconcile the device queue with the current plan.
 *
 * Safe to call on every reading: a matching signature short-circuits before any
 * native call, so a pull-to-refresh does not cancel and re-queue notifications
 * every few seconds. A missing permission leaves the signature unsaved so the
 * next run (after the user grants it) still schedules.
 */
export async function syncMorningReminder(plan: ReminderPlan): Promise<number> {
  if (!plan.enabled) {
    const saved = await loadPersisted<SavedReminder>(REMINDER_STORE);
    if (!saved?.signature) return 0;
    await cancelMorningReminders();
    await savePersisted(REMINDER_STORE, { signature: '', dates: [] } satisfies SavedReminder);
    return 0;
  }

  const entries = buildReminderEntries(plan);
  // An empty plan (offline, no forecast yet, hour already passed) must not wipe
  // a queue that is still valid for the coming days.
  if (entries.length === 0) return 0;

  const signature = signatureOf(plan, entries);
  const saved = await loadPersisted<SavedReminder>(REMINDER_STORE);
  if (saved?.signature === signature) return entries.length;

  const scheduled = await scheduleMorningReminders(entries);
  if (scheduled > 0) {
    await savePersisted(REMINDER_STORE, {
      signature,
      dates: entries.map((entry) => entry.date),
      scheduledAt: new Date().toISOString(),
    } satisfies SavedReminder);
  }
  return scheduled;
}
