export type RoundingMode = "none" | "nearest" | "up";

export type RoundingRule = {
  incrementMinutes: 0 | 6 | 15;
  mode: RoundingMode;
};

export const DEFAULT_ROUNDING: RoundingRule = { incrementMinutes: 0, mode: "none" };

export function parseRoundingRule(value: string | null | undefined): RoundingRule {
  if (!value || value === "none") return DEFAULT_ROUNDING;
  if (value === "nearest-6") return { incrementMinutes: 6, mode: "nearest" };
  if (value === "nearest-15") return { incrementMinutes: 15, mode: "nearest" };
  if (value === "up-6") return { incrementMinutes: 6, mode: "up" };
  if (value === "up-15") return { incrementMinutes: 15, mode: "up" };
  return DEFAULT_ROUNDING;
}

export function serializeRoundingRule(rule: RoundingRule): string {
  if (rule.incrementMinutes === 0 || rule.mode === "none") return "none";
  return `${rule.mode}-${rule.incrementMinutes}`;
}

export function roundSeconds(seconds: number, rule: RoundingRule): number {
  const safe = Math.max(0, Math.floor(seconds));
  if (rule.incrementMinutes === 0 || rule.mode === "none") return safe;
  const increment = rule.incrementMinutes * 60;
  if (rule.mode === "up") return Math.ceil(safe / increment) * increment;
  return Math.round(safe / increment) * increment;
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function findOverlappingIds(
  candidate: { id?: string; start: Date; end: Date },
  entries: Array<{ id: string; start: Date; end: Date }>,
): string[] {
  return entries
    .filter((entry) => entry.id !== candidate.id)
    .filter((entry) => rangesOverlap(candidate.start, candidate.end, entry.start, entry.end))
    .map((entry) => entry.id);
}

export function splitEntryAt(
  start: Date,
  end: Date,
  splitAt: Date,
): { first: { start: Date; end: Date }; second: { start: Date; end: Date } } | null {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const splitMs = splitAt.getTime();
  if (!(startMs < splitMs && splitMs < endMs)) return null;
  return {
    first: { start, end: splitAt },
    second: { start: splitAt, end },
  };
}

export function splitDurations(totalSeconds: number, firstSeconds: number): { first: number; second: number } | null {
  const total = Math.max(0, Math.floor(totalSeconds));
  const first = Math.floor(firstSeconds);
  if (first <= 0 || first >= total) return null;
  return { first, second: total - first };
}

export function retainerCrossings(prevPercent: number, nextPercent: number): Array<80 | 100> {
  const hits: Array<80 | 100> = [];
  if (prevPercent < 80 && nextPercent >= 80) hits.push(80);
  if (prevPercent < 100 && nextPercent >= 100) hits.push(100);
  return hits;
}

/**
 * Block hours from stopped entries plus the full live elapsed of a
 * running timer. Stopped snapshots omit endTime=null, so the live
 * duration must be added in full — not as a delta against durationSeconds.
 */
export function liveBlockHours(input: {
  hoursTracked: number;
  liveSeconds: number;
  runningBelongsToBlock: boolean;
}): number {
  if (!input.runningBelongsToBlock) return input.hoursTracked;
  const liveHours = Math.max(0, input.liveSeconds) / 3600;
  return input.hoursTracked + liveHours;
}

export function daysToEmpty(input: {
  hoursTarget: number;
  hoursTracked: number;
  hoursThisWeek: number;
  weekDaysElapsed: number;
}): { days: number | null; label: string } {
  const remaining = input.hoursTarget - input.hoursTracked;
  if (input.hoursTarget <= 0) return { days: null, label: "no target" };
  if (remaining <= 0) return { days: 0, label: "empty" };
  if (input.hoursThisWeek <= 0 || input.weekDaysElapsed <= 0) {
    return { days: null, label: "no recent hours" };
  }
  const pacePerDay = input.hoursThisWeek / input.weekDaysElapsed;
  if (pacePerDay <= 0) return { days: null, label: "no recent hours" };
  const days = remaining / pacePerDay;
  const rounded = Math.max(1, Math.ceil(days));
  return { days, label: `~${rounded}d at this week's pace` };
}

export function shortcutShouldIgnore(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as { tagName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown };
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest === "function") {
    return Boolean(el.closest("[contenteditable=true], input, textarea, select"));
  }
  return false;
}

export const UNASSIGNED_PROJECT_KEY = "__none__";

export type RecentTask = {
  projectId: string | null;
  description: string;
  isBillable: boolean;
};

export function uniqueRecentTasks(
  entries: Array<{ projectId?: string | null; description?: string | null; isBillable?: boolean }>,
  limit = 6,
): RecentTask[] {
  const seen = new Set<string>();
  const result: RecentTask[] = [];
  for (const entry of entries) {
    const description = (entry.description ?? "").trim();
    const projectId = entry.projectId || null;
    if (!description && !projectId) continue;
    const key = `${projectId ?? ""}|${description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ projectId, description, isBillable: entry.isBillable ?? true });
    if (result.length >= limit) break;
  }
  return result;
}

export function groupProjectsForPicker<T extends { id: string; isFavorite?: boolean }>(
  projects: T[],
  recentProjectIds: string[],
): { favorites: T[]; recents: T[]; rest: T[] } {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const favorites = projects.filter((project) => project.isFavorite);
  const favoriteIds = new Set(favorites.map((project) => project.id));
  const recents = recentProjectIds
    .map((id) => byId.get(id))
    .filter((project): project is T => !!project && !favoriteIds.has(project.id));
  const used = new Set([...favoriteIds, ...recents.map((project) => project.id)]);
  const rest = projects.filter((project) => !used.has(project.id));
  return { favorites, recents, rest };
}

export function weekDaysElapsed(now: Date, weekStartsOn: 0 | 1): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  const offset = weekStartsOn === 0 ? day : day === 0 ? 6 : day - 1;
  return Math.min(7, Math.max(1, offset + 1));
}

export function parseTrackerFilters(input: {
  q?: string | string[] | undefined;
  project?: string | string[] | undefined;
  client?: string | string[] | undefined;
  billable?: string | string[] | undefined;
}): {
  q?: string;
  projectId?: string;
  clientId?: string;
  isBillable?: boolean;
} {
  const one = (value?: string | string[]) => {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.trim() || undefined;
  };
  const q = one(input.q);
  const projectId = one(input.project);
  const clientId = one(input.client);
  const billable = one(input.billable);
  return {
    ...(q ? { q } : {}),
    ...(projectId ? { projectId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(billable === "yes" ? { isBillable: true } : billable === "no" ? { isBillable: false } : {}),
  };
}

export function formatHoursShort(seconds: number): string {
  const hours = Math.max(0, seconds) / 3600;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toFixed(1)}h`;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
