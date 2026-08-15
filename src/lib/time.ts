export function formatLocalTime(value?: string | null): string {
  if (!value) return '';
  if (value === 'Paused' || value === 'Running...') return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getLocalDateKey(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyToLocalDate(dateKey: string): Date | null {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatBrowserTitle(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mmss = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

export type TimerChromeStatus = 'running' | 'paused' | 'stopped';

export function timerStatusFromEntry(timer: {
  pausedAtISO?: string | null;
  isPaused?: boolean;
} | null | undefined): TimerChromeStatus {
  if (!timer) return 'stopped';
  if (timer.isPaused || timer.pausedAtISO) return 'paused';
  return 'running';
}

/** User intent wins so a pause is not dropped if the server payload briefly lacks the timer. */
export function resolveTimerChromeStatus(
  serverStatus: TimerChromeStatus,
  intent: TimerChromeStatus | null,
): TimerChromeStatus {
  if (intent == null) return serverStatus;
  return intent;
}

export function shouldClearTimerIntent(
  serverStatus: TimerChromeStatus,
  intent: TimerChromeStatus | null,
): boolean {
  return intent != null && intent === serverStatus;
}

export function browserTitle(status: TimerChromeStatus, elapsedSeconds: number): string {
  if (status === 'running') return `${formatBrowserTitle(elapsedSeconds)} - Chronos`;
  if (status === 'paused') return `\u23F8 ${formatBrowserTitle(elapsedSeconds)} - Chronos`;
  return 'Chronos';
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function weekRangeFromParam(
  weekParam: string | null | undefined,
  now = new Date(),
): { start: Date; endExclusive: Date; weekStartKey: string } {
  const parsed = weekParam ? parseDateKeyToLocalDate(weekParam) : null;
  const start = startOfLocalWeek(parsed ?? now);
  const endExclusive = addLocalDays(start, 7);
  return { start, endExclusive, weekStartKey: formatLocalDateKey(start) };
}

export function parsePageParam(value: string | null | undefined, fallback = 1): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return n;
}
