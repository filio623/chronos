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

export type TimerSessionSnapshot = {
  id: string;
  description: string;
  projectId?: string | null;
};

export type ResolveActiveSessionInput = {
  activeTimer: TimerSessionSnapshot | null;
  pendingTimerId: string | null;
  pendingDescription: string;
  pendingProjectId: string | null;
  intent: TimerChromeStatus | null;
  isStarting: boolean;
};

export type ResolvedTimerSession = {
  sessionTimerId: string | null;
  description: string;
  projectId: string | null;
  preferPending: boolean;
};

/**
 * Which timer the chrome should control. Prefer the pending start when the
 * server payload is still the previous row (or still null).
 */
export function resolveActiveSession(input: ResolveActiveSessionInput): ResolvedTimerSession {
  const { activeTimer, pendingTimerId, pendingDescription, pendingProjectId, isStarting } = input;
  const pendingIsAuthoritative =
    pendingTimerId != null && pendingTimerId !== activeTimer?.id;
  const startingWithoutId = isStarting && pendingTimerId == null;
  const preferPending = pendingIsAuthoritative || startingWithoutId;

  if (preferPending) {
    return {
      sessionTimerId: pendingTimerId,
      description: pendingDescription.trim(),
      projectId: pendingProjectId,
      preferPending: true,
    };
  }

  return {
    sessionTimerId: activeTimer?.id ?? pendingTimerId,
    description: (activeTimer?.description || pendingDescription).trim(),
    projectId: activeTimer?.projectId ?? pendingProjectId ?? null,
    preferPending: false,
  };
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

export type WeekStartsOn = 0 | 1;

export function parseWeekStartsOn(value: string | null | undefined): WeekStartsOn {
  return value === "1" ? 1 : 0;
}

export function startOfLocalWeek(date: Date, weekStartsOn: WeekStartsOn = 0): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const offset = weekStartsOn === 0 ? day : day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function weekRangeFromParam(
  weekParam: string | null | undefined,
  now = new Date(),
  weekStartsOn: WeekStartsOn = 0,
): { start: Date; endExclusive: Date; weekStartKey: string } {
  const parsed = weekParam ? parseDateKeyToLocalDate(weekParam) : null;
  const start = startOfLocalWeek(parsed ?? now, weekStartsOn);
  const endExclusive = addLocalDays(start, 7);
  return { start, endExclusive, weekStartKey: formatLocalDateKey(start) };
}

export function parsePageParam(value: string | null | undefined, fallback = 1): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return n;
}

export function defaultLocalDateKey(now = new Date()): string {
  return formatLocalDateKey(now);
}

export function parseTimeHHmm(value: string): { hours: number; minutes: number } | null {
  const [hoursStr, minutesStr] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function combineLocalDateAndTime(dateKey: string, timeHHmm: string): Date | null {
  const day = parseDateKeyToLocalDate(dateKey);
  const time = parseTimeHHmm(timeHHmm);
  if (!day || !time) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hours, time.minutes, 0, 0);
}

export function resolveManualRange(
  dateKey: string,
  startHHmm: string,
  endHHmm: string,
): { start: Date; end: Date; wrappedOvernight: boolean } | null {
  const start = combineLocalDateAndTime(dateKey, startHHmm);
  const sameDayEnd = combineLocalDateAndTime(dateKey, endHHmm);
  if (!start || !sameDayEnd) return null;
  if (sameDayEnd.getTime() > start.getTime()) {
    return { start, end: sameDayEnd, wrappedOvernight: false };
  }
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
    sameDayEnd.getHours(),
    sameDayEnd.getMinutes(),
    0,
    0,
  );
  return { start, end, wrappedOvernight: true };
}

export function hhmmFromDate(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function hhmmFromIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "09:00";
  return hhmmFromDate(date);
}
