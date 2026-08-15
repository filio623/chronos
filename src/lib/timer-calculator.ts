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
    return Math.max(0, clampSeconds(toMs(entry.endTime) - startMs) - pausedSeconds);
  }

  if (entry.pausedAt != null) {
    return Math.max(0, clampSeconds(toMs(entry.pausedAt) - startMs) - pausedSeconds);
  }

  return Math.max(0, clampSeconds(Date.now() - startMs) - pausedSeconds);
}

export function timeEntryToTimerLike(entry: {
  startTimeISO?: string;
  startTime: string;
  pausedAtISO?: string | null;
  pausedSeconds?: number;
  endTime?: string | null;
  durationSeconds?: number;
}): TimerLike {
  const running = !entry.endTime || entry.endTime === "Running..." || entry.endTime === "Paused";
  return {
    startTime: entry.startTimeISO || entry.startTime,
    endTime: running ? null : (entry.endTime ?? null),
    pausedAt: entry.pausedAtISO == null ? null : entry.pausedAtISO,
    pausedSeconds: entry.pausedSeconds ?? 0,
    duration: running ? null : entry.durationSeconds,
  };
}

export function displayElapsedSeconds(input: {
  status: "running" | "paused" | "stopped";
  serverStatus: "running" | "paused" | "stopped";
  entry: TimerLike | null;
  frozenElapsed: number | null;
  resumeStartedAt: number | null;
  nowMs: number;
}): number {
  const { status, serverStatus, entry, frozenElapsed, resumeStartedAt, nowMs } = input;
  if (status === "stopped") return 0;
  if (status === "paused") {
    return frozenElapsed ?? (entry ? elapsed(entry) : 0);
  }
  if (frozenElapsed != null && resumeStartedAt != null && serverStatus !== "running") {
    return frozenElapsed + Math.max(0, Math.floor((nowMs - resumeStartedAt) / 1000));
  }
  if (entry) {
    return TimerCalculator.elapsedAt(entry, new Date(nowMs));
  }
  return 0;
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
};
