export type TimerLike = {
  startTime: Date | string;
  endTime: Date | string | null;
  pausedAt: Date | string | null;
  pausedSeconds: number;
  duration?: number | null;
};

export type PersistedTimings = {
  pausedSeconds: number;
  duration: number;
};

function toMs(value: Date | string): number {
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function clampSeconds(deltaMs: number): number {
  return Math.max(0, Math.floor(deltaMs / 1000));
}

export function elapsed(entry: TimerLike): number {
  if (entry.endTime != null && entry.duration != null) {
    return Math.max(0, entry.duration);
  }

  const startMs = toMs(entry.startTime);
  const pausedSeconds = entry.pausedSeconds ?? 0;

  if (entry.endTime != null) {
    return clampSeconds(toMs(entry.endTime) - startMs) - pausedSeconds;
  }

  if (entry.pausedAt != null) {
    return Math.max(0, clampSeconds(toMs(entry.pausedAt) - startMs) - pausedSeconds);
  }

  return Math.max(0, clampSeconds(Date.now() - startMs) - pausedSeconds);
}

export const TimerCalculator = {
  elapsedAt(entry: TimerLike, at: Date): number {
    const startMs = toMs(entry.startTime);
    const pausedSeconds = entry.pausedSeconds ?? 0;
    return Math.max(0, clampSeconds(at.getTime() - startMs) - pausedSeconds);
  },

  finalizeStop(entry: TimerLike, stoppedAt: Date): PersistedTimings {
    const basePaused = entry.pausedSeconds ?? 0;
    const extraPaused = entry.pausedAt != null
      ? clampSeconds(stoppedAt.getTime() - toMs(entry.pausedAt))
      : 0;
    const pausedSeconds = basePaused + extraPaused;
    const duration = Math.max(
      0,
      clampSeconds(stoppedAt.getTime() - toMs(entry.startTime)) - pausedSeconds,
    );
    return { pausedSeconds, duration };
  },

  finalizeResume(entry: TimerLike, resumedAt: Date): { pausedSeconds: number } {
    const basePaused = entry.pausedSeconds ?? 0;
    if (entry.pausedAt == null) return { pausedSeconds: basePaused };
    const extra = clampSeconds(resumedAt.getTime() - toMs(entry.pausedAt));
    return { pausedSeconds: basePaused + extra };
  },

  recomputeDuration(entry: TimerLike): number {
    if (entry.endTime == null) return entry.duration ?? 0;
    const pausedSeconds = entry.pausedSeconds ?? 0;
    const totalSeconds = clampSeconds(toMs(entry.endTime) - toMs(entry.startTime));
    return Math.max(0, totalSeconds - pausedSeconds);
  },
};
