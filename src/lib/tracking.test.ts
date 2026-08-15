import { describe, expect, it } from "vitest";
import { startOfLocalWeek, weekRangeFromParam } from "./time";
import {
  UNASSIGNED_PROJECT_KEY,
  daysToEmpty,
  findOverlappingIds,
  groupProjectsForPicker,
  liveBlockHours,
  parseTrackerFilters,
  rangesOverlap,
  retainerCrossings,
  roundSeconds,
  shortcutShouldIgnore,
  splitDurations,
  splitEntryAt,
  uniqueRecentTasks,
  weekDaysElapsed,
} from "./tracking";

describe("rangesOverlap", () => {
  it("detects overlapping closed ranges", () => {
    expect(
      rangesOverlap(
        new Date(2026, 7, 15, 9, 0),
        new Date(2026, 7, 15, 11, 0),
        new Date(2026, 7, 15, 10, 0),
        new Date(2026, 7, 15, 12, 0),
      ),
    ).toBe(true);
  });

  it("allows touching endpoints", () => {
    expect(
      rangesOverlap(
        new Date(2026, 7, 15, 9, 0),
        new Date(2026, 7, 15, 10, 0),
        new Date(2026, 7, 15, 10, 0),
        new Date(2026, 7, 15, 11, 0),
      ),
    ).toBe(false);
  });
});

describe("findOverlappingIds", () => {
  it("skips the candidate itself", () => {
    const ids = findOverlappingIds(
      { id: "a", start: new Date(2026, 7, 15, 9, 0), end: new Date(2026, 7, 15, 11, 0) },
      [
        { id: "a", start: new Date(2026, 7, 15, 9, 0), end: new Date(2026, 7, 15, 11, 0) },
        { id: "b", start: new Date(2026, 7, 15, 10, 0), end: new Date(2026, 7, 15, 12, 0) },
      ],
    );
    expect(ids).toEqual(["b"]);
  });
});

describe("splitEntryAt / splitDurations", () => {
  it("splits a range at a midpoint", () => {
    const start = new Date(2026, 7, 15, 9, 0);
    const end = new Date(2026, 7, 15, 12, 0);
    const splitAt = new Date(2026, 7, 15, 10, 30);
    const parts = splitEntryAt(start, end, splitAt);
    expect(parts?.first.end).toEqual(splitAt);
    expect(parts?.second.start).toEqual(splitAt);
    const durations = splitDurations(10800, 5400);
    expect(durations).toEqual({ first: 5400, second: 5400 });
    expect((durations?.first ?? 0) + (durations?.second ?? 0)).toBe(10800);
  });

  it("rejects a split outside the range", () => {
    expect(
      splitEntryAt(new Date(2026, 7, 15, 9, 0), new Date(2026, 7, 15, 10, 0), new Date(2026, 7, 15, 10, 0)),
    ).toBeNull();
    expect(splitDurations(100, 0)).toBeNull();
    expect(splitDurations(100, 100)).toBeNull();
  });
});

describe("roundSeconds", () => {
  it("leaves seconds unchanged when rounding is off", () => {
    expect(roundSeconds(125, { incrementMinutes: 0, mode: "none" })).toBe(125);
  });

  it("rounds to the nearest 15 minutes", () => {
    expect(roundSeconds(7 * 60, { incrementMinutes: 15, mode: "nearest" })).toBe(0);
    expect(roundSeconds(8 * 60, { incrementMinutes: 15, mode: "nearest" })).toBe(15 * 60);
    expect(roundSeconds(22 * 60, { incrementMinutes: 15, mode: "nearest" })).toBe(15 * 60);
  });

  it("rounds up to 6 minutes", () => {
    expect(roundSeconds(1, { incrementMinutes: 6, mode: "up" })).toBe(6 * 60);
    expect(roundSeconds(6 * 60, { incrementMinutes: 6, mode: "up" })).toBe(6 * 60);
  });
});

describe("week-start bounds", () => {
  it("starts Sunday or Monday", () => {
    const wednesday = new Date(2026, 7, 12, 15, 0);
    expect(startOfLocalWeek(wednesday, 0).getDay()).toBe(0);
    expect(startOfLocalWeek(wednesday, 1).getDay()).toBe(1);
    const sun = weekRangeFromParam("2026-08-12", wednesday, 0);
    const mon = weekRangeFromParam("2026-08-12", wednesday, 1);
    expect(sun.weekStartKey).toBe("2026-08-09");
    expect(mon.weekStartKey).toBe("2026-08-10");
  });
});

describe("daysToEmpty", () => {
  it("uses this week's pace", () => {
    const result = daysToEmpty({
      hoursTarget: 10,
      hoursTracked: 4,
      hoursThisWeek: 6,
      weekDaysElapsed: 3,
    });
    expect(result.days).toBe(3);
    expect(result.label).toBe("~3d at this week's pace");
  });

  it("reports no recent hours when the week is empty", () => {
    expect(
      daysToEmpty({ hoursTarget: 10, hoursTracked: 2, hoursThisWeek: 0, weekDaysElapsed: 2 }).label,
    ).toBe("no recent hours");
  });
});

describe("retainerCrossings", () => {
  it("fires once when crossing 80 and 100", () => {
    expect(retainerCrossings(79, 80)).toEqual([80]);
    expect(retainerCrossings(99, 101)).toEqual([100]);
    expect(retainerCrossings(50, 50)).toEqual([]);
    expect(retainerCrossings(70, 110)).toEqual([80, 100]);
  });
});

describe("liveBlockHours", () => {
  it("adds the full live elapsed, not a delta against durationSeconds", () => {
    // hoursTracked is stopped work only (getBlockHoursMap excludes endTime=null).
    // A 54-minute forgotten timer (3240s) must count even if durationSeconds
    // on the mapped running row is also 3240.
    expect(
      liveBlockHours({
        hoursTracked: 7,
        liveSeconds: 3240,
        runningBelongsToBlock: true,
      }),
    ).toBe(7 + 3240 / 3600);
    expect(
      liveBlockHours({
        hoursTracked: 7,
        liveSeconds: 3240,
        runningBelongsToBlock: false,
      }),
    ).toBe(7);
  });

  it("crosses 80% only when the live hours are included in full", () => {
    const stopped = 7.5;
    const liveSeconds = 0.6 * 3600;
    const withDeltaOnly = stopped + Math.max(0, liveSeconds / 3600 - liveSeconds / 3600);
    const withFullLive = liveBlockHours({
      hoursTracked: stopped,
      liveSeconds,
      runningBelongsToBlock: true,
    });
    expect(retainerCrossings(75, (withDeltaOnly / 10) * 100)).toEqual([]);
    expect(retainerCrossings(75, (withFullLive / 10) * 100)).toEqual([80]);
  });
});

describe("shortcutShouldIgnore", () => {
  it("ignores editable fields and allows the document body", () => {
    expect(shortcutShouldIgnore({ tagName: "INPUT", isContentEditable: false, closest: () => null } as unknown as EventTarget)).toBe(true);
    expect(shortcutShouldIgnore({ tagName: "DIV", isContentEditable: false, closest: () => null } as unknown as EventTarget)).toBe(false);
  });
});

describe("uniqueRecentTasks", () => {
  it("dedupes by project and description", () => {
    const recents = uniqueRecentTasks([
      { projectId: "p1", description: "Design", isBillable: true },
      { projectId: "p1", description: "Design", isBillable: false },
      { projectId: "p2", description: "Design", isBillable: true },
      { projectId: null, description: "", isBillable: true },
    ], 5);
    expect(recents).toEqual([
      { projectId: "p1", description: "Design", isBillable: true },
      { projectId: "p2", description: "Design", isBillable: true },
    ]);
  });
});

describe("groupProjectsForPicker", () => {
  it("pins favorites then recents", () => {
    const grouped = groupProjectsForPicker(
      [
        { id: "a", isFavorite: false },
        { id: "b", isFavorite: true },
        { id: "c", isFavorite: false },
      ],
      ["c", "a", "missing"],
    );
    expect(grouped.favorites.map((p) => p.id)).toEqual(["b"]);
    expect(grouped.recents.map((p) => p.id)).toEqual(["c", "a"]);
    expect(grouped.rest).toEqual([]);
  });
});

describe("parseTrackerFilters", () => {
  it("parses URL-like params including unassigned", () => {
    expect(parseTrackerFilters({ q: " acme ", project: UNASSIGNED_PROJECT_KEY, billable: "yes" })).toEqual({
      q: "acme",
      projectId: UNASSIGNED_PROJECT_KEY,
      isBillable: true,
    });
  });
});

describe("weekDaysElapsed", () => {
  it("counts elapsed days from the configured week start", () => {
    const wednesday = new Date(2026, 7, 12, 15, 0);
    expect(weekDaysElapsed(wednesday, 0)).toBe(4);
    expect(weekDaysElapsed(wednesday, 1)).toBe(3);
  });
});
