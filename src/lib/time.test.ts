import { describe, expect, it } from "vitest";
import {
  browserTitle,
  defaultLocalDateKey,
  formatBrowserTitle,
  parseDateKeyToLocalDate,
  parsePageParam,
  resolveActiveSession,
  resolveManualRange,
  resolveTimerChromeStatus,
  shouldClearTimerIntent,
  timerStatusFromEntry,
  weekRangeFromParam,
} from "./time";

describe("formatBrowserTitle", () => {
  it("formats under an hour as mm:ss", () => {
    expect(formatBrowserTitle(59)).toBe("00:59");
  });

  it("rolls hours past 3600 seconds", () => {
    expect(formatBrowserTitle(3903)).toBe("1:05:03");
  });
});

describe("browserTitle", () => {
  it("keeps elapsed in the tab while paused", () => {
    expect(browserTitle("paused", 125)).toBe("\u23F8 02:05 - Chronos");
  });

  it("shows running elapsed", () => {
    expect(browserTitle("running", 3903)).toBe("1:05:03 - Chronos");
  });

  it("clears to Chronos when stopped", () => {
    expect(browserTitle("stopped", 125)).toBe("Chronos");
  });
});

describe("timer chrome status", () => {
  it("treats a missing server timer as stopped", () => {
    expect(timerStatusFromEntry(null)).toBe("stopped");
  });

  it("treats pausedAtISO as paused", () => {
    expect(timerStatusFromEntry({ pausedAtISO: "2026-08-14T12:00:00.000Z" })).toBe("paused");
  });

  it("keeps pause intent when the server payload is empty", () => {
    expect(resolveTimerChromeStatus("stopped", "paused")).toBe("paused");
    expect(shouldClearTimerIntent("stopped", "paused")).toBe(false);
  });

  it("clears intent once the server agrees", () => {
    expect(shouldClearTimerIntent("paused", "paused")).toBe(true);
    expect(resolveTimerChromeStatus("paused", null)).toBe("paused");
  });
});

describe("weekRangeFromParam", () => {
  it("loads a Sunday-start week that is not the current week", () => {
    const range = weekRangeFromParam("2026-01-07", new Date(2026, 7, 14));
    expect(range.weekStartKey).toBe("2026-01-04");
    expect(range.start.getTime()).toBe(parseDateKeyToLocalDate("2026-01-04")?.getTime());
    expect(range.endExclusive.getTime()).toBe(parseDateKeyToLocalDate("2026-01-11")?.getTime());
  });
});

describe("parsePageParam", () => {
  it("rejects non-positive pages", () => {
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("3")).toBe(3);
  });
});

describe("resolveActiveSession", () => {
  const oldTimer = { id: "old", description: "Old task", projectId: "p-old" };

  it("uses pending id and description while the server still has the previous timer", () => {
    const session = resolveActiveSession({
      activeTimer: oldTimer,
      pendingTimerId: "new",
      pendingDescription: "New task",
      pendingProjectId: "p-new",
      intent: "running",
      isStarting: false,
    });
    expect(session).toEqual({
      sessionTimerId: "new",
      description: "New task",
      projectId: "p-new",
      preferPending: true,
    });
  });

  it("keeps the pending id after pause before RSC refresh", () => {
    const session = resolveActiveSession({
      activeTimer: oldTimer,
      pendingTimerId: "new",
      pendingDescription: "New task",
      pendingProjectId: "p-new",
      intent: "paused",
      isStarting: false,
    });
    expect(session.sessionTimerId).toBe("new");
    expect(session.preferPending).toBe(true);
  });

  it("has no action id while start is in flight", () => {
    const session = resolveActiveSession({
      activeTimer: null,
      pendingTimerId: null,
      pendingDescription: "Starting",
      pendingProjectId: null,
      intent: "running",
      isStarting: true,
    });
    expect(session.sessionTimerId).toBeNull();
    expect(session.description).toBe("Starting");
    expect(session.preferPending).toBe(true);
  });

  it("keeps the server id and description on resume (intent running, not starting)", () => {
    const session = resolveActiveSession({
      activeTimer: { id: "live", description: "Keep me", projectId: "p1" },
      pendingTimerId: null,
      pendingDescription: "",
      pendingProjectId: null,
      intent: "running",
      isStarting: false,
    });
    expect(session).toEqual({
      sessionTimerId: "live",
      description: "Keep me",
      projectId: "p1",
      preferPending: false,
    });
  });

  it("follows the server row once ids match", () => {
    const session = resolveActiveSession({
      activeTimer: { id: "new", description: "New task", projectId: "p-new" },
      pendingTimerId: "new",
      pendingDescription: "New task",
      pendingProjectId: "p-new",
      intent: null,
      isStarting: false,
    });
    expect(session).toEqual({
      sessionTimerId: "new",
      description: "New task",
      projectId: "p-new",
      preferPending: false,
    });
  });
});

describe("defaultLocalDateKey", () => {
  it("uses the local calendar day, not UTC ISO", () => {
    const evening = new Date(2026, 7, 15, 23, 30, 0);
    expect(defaultLocalDateKey(evening)).toBe("2026-08-15");
  });
});

describe("resolveManualRange", () => {
  it("keeps a same-day range", () => {
    const range = resolveManualRange("2026-08-15", "09:00", "10:30");
    expect(range?.wrappedOvernight).toBe(false);
    expect(range?.start).toEqual(new Date(2026, 7, 15, 9, 0, 0, 0));
    expect(range?.end).toEqual(new Date(2026, 7, 15, 10, 30, 0, 0));
  });

  it("wraps overnight when end is not after start", () => {
    const range = resolveManualRange("2026-08-15", "22:00", "01:00");
    expect(range?.wrappedOvernight).toBe(true);
    expect(range?.start).toEqual(new Date(2026, 7, 15, 22, 0, 0, 0));
    expect(range?.end).toEqual(new Date(2026, 7, 16, 1, 0, 0, 0));
  });
});
