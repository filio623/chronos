"use client";

import React, { useEffect, useState } from "react";
import { browserTitle, formatDuration, getLocalDateKey } from "@/lib/time";
import { displayElapsedSeconds, timeEntryToTimerLike } from "@/lib/timer-calculator";
import { formatHoursShort, roundSeconds } from "@/lib/tracking";
import { useTimerSession } from "./TimerSessionContext";
import type { TimeEntry } from "@/types";

export function LiveElapsed({
  entry,
  className,
}: {
  entry: TimeEntry;
  className?: string;
}) {
  const session = useTimerSession();
  const isLive = session.timerId === entry.id && session.status !== "stopped";
  const shouldTick = isLive ? session.status === "running" : !entry.isPaused && (entry.endTime === "Running..." || !entry.endTime);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldTick]);

  const seconds = isLive
    ? displayElapsedSeconds({
        status: session.status,
        serverStatus: session.serverStatus,
        entry: timeEntryToTimerLike(entry),
        frozenElapsed: session.frozenElapsed,
        resumeStartedAt: session.resumeStartedAt,
        nowMs,
      })
    : entry.endTime && entry.endTime !== "Running..." && entry.endTime !== "Paused"
      ? entry.durationSeconds
      : displayElapsedSeconds({
          status: entry.isPaused ? "paused" : "running",
          serverStatus: entry.isPaused ? "paused" : "running",
          entry: timeEntryToTimerLike(entry),
          frozenElapsed: null,
          resumeStartedAt: null,
          nowMs,
        });

  const display = isLive && shouldTick ? seconds : roundSeconds(seconds, session.rounding);
  return <span className={className}>{formatDuration(display)}</span>;
}

export function LiveDayTotal({
  entries,
  className,
  ...rest
}: {
  entries: TimeEntry[];
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const session = useTimerSession();
  const live = entries.find((entry) => entry.id === session.timerId && session.status !== "stopped");
  const shouldTick = !!live && session.status === "running";
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldTick]);

  const base = entries.reduce((sum, entry) => {
    if (live && entry.id === live.id) return sum;
    return sum + (entry.durationSeconds || 0);
  }, 0);

  const extra = live
    ? displayElapsedSeconds({
        status: session.status,
        serverStatus: session.serverStatus,
        entry: timeEntryToTimerLike(live),
        frozenElapsed: session.frozenElapsed,
        resumeStartedAt: session.resumeStartedAt,
        nowMs,
      })
    : 0;

  const display = roundSeconds(base + extra, session.rounding);
  return <span className={className} {...rest}>{formatDuration(display)}</span>;
}

export function LivePeriodTotals({
  weekEntries,
  todayKey,
  className,
}: {
  weekEntries: TimeEntry[];
  todayKey: string;
  className?: string;
}) {
  const session = useTimerSession();
  const live = weekEntries.find((entry) => entry.id === session.timerId && session.status !== "stopped");
  const shouldTick = !!live && session.status === "running";
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldTick]);

  const liveSeconds = live
    ? displayElapsedSeconds({
        status: session.status,
        serverStatus: session.serverStatus,
        entry: timeEntryToTimerLike(live),
        frozenElapsed: session.frozenElapsed,
        resumeStartedAt: session.resumeStartedAt,
        nowMs,
      })
    : 0;
  const liveIsBillable = live?.isBillable ?? session.isBillable;
  const liveToday = live
    ? getLocalDateKey(live.startTimeISO || live.startTime || live.date) === todayKey
    : false;

  let today = 0;
  let todayBillable = 0;
  let week = 0;
  let weekBillable = 0;

  for (const entry of weekEntries) {
    if (live && entry.id === live.id) continue;
    const seconds = entry.durationSeconds || 0;
    week += seconds;
    if (entry.isBillable) weekBillable += seconds;
    if (getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date) === todayKey) {
      today += seconds;
      if (entry.isBillable) todayBillable += seconds;
    }
  }

  if (live) {
    week += liveSeconds;
    if (liveIsBillable) weekBillable += liveSeconds;
    if (liveToday) {
      today += liveSeconds;
      if (liveIsBillable) todayBillable += liveSeconds;
    }
  }

  return (
    <div className={className} data-testid="period-totals">
      Today {formatHoursShort(roundSeconds(today, session.rounding))}
      <span className="text-slate-400"> · {formatHoursShort(roundSeconds(todayBillable, session.rounding))} billable</span>
      <span className="mx-1.5 text-slate-300">·</span>
      Week {formatHoursShort(roundSeconds(week, session.rounding))}
      <span className="text-slate-400"> · {formatHoursShort(roundSeconds(weekBillable, session.rounding))} billable</span>
    </div>
  );
}

export function BrowserTitle({
  status,
  entry,
  frozenElapsed,
  resumeStartedAt,
  serverStatus,
}: {
  status: "running" | "paused" | "stopped";
  serverStatus: "running" | "paused" | "stopped";
  entry: Parameters<typeof timeEntryToTimerLike>[0] | null;
  frozenElapsed: number | null;
  resumeStartedAt: number | null;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const seconds = displayElapsedSeconds({
    status,
    serverStatus,
    entry: entry ? timeEntryToTimerLike(entry) : null,
    frozenElapsed,
    resumeStartedAt,
    nowMs,
  });

  useEffect(() => {
    const wanted = () => browserTitle(status, seconds);
    document.title = wanted();
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => {
      const next = wanted();
      if (document.title !== next) document.title = next;
    });
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [status, seconds]);

  return null;
}

export function LiveChromeDuration({
  status,
  serverStatus,
  entry,
  frozenElapsed,
  resumeStartedAt,
  className,
}: {
  status: "running" | "paused" | "stopped";
  serverStatus: "running" | "paused" | "stopped";
  entry: Parameters<typeof timeEntryToTimerLike>[0] | null;
  frozenElapsed: number | null;
  resumeStartedAt: number | null;
  className?: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const seconds = displayElapsedSeconds({
    status,
    serverStatus,
    entry: entry ? timeEntryToTimerLike(entry) : null,
    frozenElapsed,
    resumeStartedAt,
    nowMs,
  });

  return <span className={className}>{formatDuration(seconds)}</span>;
}
