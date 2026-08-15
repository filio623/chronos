import { describe, expect, it } from "vitest";
import {
  browserTitle,
  formatBrowserTitle,
  parseDateKeyToLocalDate,
  parsePageParam,
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
