/**
 * The morning reminder is the only Awanin notification that can arrive while the
 * app is closed without a server, so the planner is tested for what makes that
 * safe: local times per timezone (WIB/WITA/WIT), no reminders in the past, and a
 * signature that avoids re-queueing on every refresh.
 */
import { cancelMorningReminders, scheduleMorningReminders } from '@/lib/push';
import { loadPersisted, savePersisted } from '@/lib/persist';
import type { DayAqi } from '@/api/openMeteo';
import {
  REMINDER_DAYS,
  buildReminderEntries,
  clampReminderHour,
  reminderLabel,
  syncMorningReminder,
  zonedReminderTime,
} from '@/lib/reminders';

// babel-jest hoists these above the imports, so the module under test never sees
// the real notification or storage layer.
jest.mock('@/lib/push', () => ({
  cancelMorningReminders: jest.fn(async () => {}),
  scheduleMorningReminders: jest.fn(async () => 3),
}));
jest.mock('@/lib/persist', () => ({
  loadPersisted: jest.fn(async () => null),
  savePersisted: jest.fn(async () => {}),
}));

const forecast: DayAqi[] = [
  { day: '2026-11-09', avg: 120, max: 140, min: 90 },
  { day: '2026-11-10', avg: 95, max: 120, min: 70 },
  { day: '2026-11-11', avg: 60, max: 80, min: 40 },
  { day: '2026-11-12', avg: 150, max: 170, min: 120 },
];

const plan = {
  enabled: true,
  hour: 6,
  place: 'Jakarta Pusat',
  slug: 'jakarta-pusat',
  timezone: 'Asia/Jakarta',
  scale: 'us' as const,
  forecast,
};

describe('zonedReminderTime', () => {
  it('rings 06.00 WIB, not 06.00 UTC', () => {
    expect(zonedReminderTime('2026-11-10', 6, 'Asia/Jakarta')).toBe(Date.UTC(2026, 10, 9, 23));
  });

  it('follows the location zone, so Jayapura maps two hours earlier in UTC', () => {
    expect(zonedReminderTime('2026-11-10', 6, 'Asia/Jayapura')).toBe(Date.UTC(2026, 10, 9, 21));
  });

  it('returns NaN for a malformed day instead of throwing', () => {
    expect(Number.isNaN(zonedReminderTime('besok', 6, 'Asia/Jakarta'))).toBe(true);
  });
});

describe('clampReminderHour', () => {
  it('keeps the hour inside the pickable morning range', () => {
    expect(clampReminderHour(3)).toBe(5);
    expect(clampReminderHour(7)).toBe(7);
    expect(clampReminderHour(23)).toBe(9);
    expect(reminderLabel(6)).toBe('06.00');
  });
});

describe('buildReminderEntries', () => {
  it('skips a day whose hour has passed and caps the queue at three days', () => {
    // 08.00 WIB on the 9th: today's 06.00 slot is gone, so the queue starts tomorrow.
    const now = Date.UTC(2026, 10, 9, 1, 0);
    const entries = buildReminderEntries({ ...plan, now });

    expect(entries).toHaveLength(REMINDER_DAYS);
    expect(entries.map((entry) => entry.date)).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(entries[0].at).toBe(Date.UTC(2026, 10, 9, 23));
  });

  it('keeps today when the hour is still ahead', () => {
    const now = Date.UTC(2026, 10, 8, 20, 0); // 03.00 WIB on the 9th
    const entries = buildReminderEntries({ ...plan, now });

    expect(entries.map((entry) => entry.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
    ]);
  });

  it('writes the forecast value, category and place into the copy', () => {
    const now = Date.UTC(2026, 10, 8, 1, 0);
    const [first] = buildReminderEntries({ ...plan, now });

    expect(first.title).toContain('Jakarta Pusat');
    expect(first.body).toMatch(/AQI/);
    expect(first.body).toContain('120');
    expect(first.body).toContain('(Sensitif)');
    expect(first.slug).toBe('jakarta-pusat');
  });

  it('schedules nothing when the switch is off', () => {
    expect(buildReminderEntries({ ...plan, enabled: false, now: 0 })).toEqual([]);
  });
});

describe('syncMorningReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (scheduleMorningReminders as jest.Mock).mockResolvedValue(3);
    (loadPersisted as jest.Mock).mockResolvedValue(null);
  });

  it('queues the plan and remembers its signature', async () => {
    const now = Date.UTC(2026, 10, 8, 1, 0);

    await expect(syncMorningReminder({ ...plan, now })).resolves.toBe(3);

    expect(scheduleMorningReminders).toHaveBeenCalledTimes(1);
    expect(savePersisted).toHaveBeenCalledWith(
      'reminder',
      expect.objectContaining({ dates: ['2026-11-09', '2026-11-10', '2026-11-11'] }),
    );
  });

  it('does not touch the native queue when nothing changed', async () => {
    const now = Date.UTC(2026, 10, 8, 1, 0);
    await syncMorningReminder({ ...plan, now });
    const saved = (savePersisted as jest.Mock).mock.calls[0][1];
    (loadPersisted as jest.Mock).mockResolvedValue(saved);

    await syncMorningReminder({ ...plan, now });

    expect(scheduleMorningReminders).toHaveBeenCalledTimes(1);
  });

  it('re-schedules when the picked hour changes', async () => {
    const now = Date.UTC(2026, 10, 8, 1, 0);
    await syncMorningReminder({ ...plan, now });
    const saved = (savePersisted as jest.Mock).mock.calls[0][1];
    (loadPersisted as jest.Mock).mockResolvedValue(saved);

    await syncMorningReminder({ ...plan, hour: 7, now });

    expect(scheduleMorningReminders).toHaveBeenCalledTimes(2);
  });

  it('cancels the queue when the user switches it off', async () => {
    (loadPersisted as jest.Mock).mockResolvedValue({
      signature: 'x',
      dates: ['2026-11-09'],
    });

    await expect(syncMorningReminder({ ...plan, enabled: false })).resolves.toBe(0);
    expect(cancelMorningReminders).toHaveBeenCalledTimes(1);
  });

  it('leaves an existing queue alone when the forecast is missing', async () => {
    await expect(syncMorningReminder({ ...plan, forecast: [] })).resolves.toBe(0);

    expect(scheduleMorningReminders).not.toHaveBeenCalled();
    expect(cancelMorningReminders).not.toHaveBeenCalled();
  });
});
