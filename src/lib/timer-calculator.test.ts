import { describe, expect, it } from "vitest";
import { elapsed, TimerCalculator } from "./timer-calculator";

describe("elapsed", () => {
  it("never goes negative when pausedSeconds exceeds the start-to-end span", () => {
    expect(
      elapsed({
        startTime: "2026-08-14T12:00:00.000Z",
        endTime: "2026-08-14T12:00:10.000Z",
        pausedAt: null,
        pausedSeconds: 30,
      }),
    ).toBe(0);
  });

  it("uses stored duration when the entry is stopped", () => {
    expect(
      elapsed({
        startTime: "2026-08-14T12:00:00.000Z",
        endTime: "2026-08-14T12:10:00.000Z",
        pausedAt: null,
        pausedSeconds: 0,
        duration: 540,
      }),
    ).toBe(540);
  });

  it("freezes at pausedAt while paused", () => {
    expect(
      elapsed({
        startTime: "2026-08-14T12:00:00.000Z",
        endTime: null,
        pausedAt: "2026-08-14T12:02:00.000Z",
        pausedSeconds: 0,
      }),
    ).toBe(120);
  });
});

describe("TimerCalculator", () => {
  it("finalizeStop includes the open pause window", () => {
    expect(
      TimerCalculator.finalizeStop(
        {
          startTime: "2026-08-14T12:00:00.000Z",
          endTime: null,
          pausedAt: "2026-08-14T12:05:00.000Z",
          pausedSeconds: 10,
        },
        new Date("2026-08-14T12:06:00.000Z"),
      ),
    ).toEqual({ pausedSeconds: 70, duration: 290 });
  });

  it("finalizeResume accumulates the pause window", () => {
    expect(
      TimerCalculator.finalizeResume(
        {
          startTime: "2026-08-14T12:00:00.000Z",
          endTime: null,
          pausedAt: "2026-08-14T12:05:00.000Z",
          pausedSeconds: 10,
        },
        new Date("2026-08-14T12:06:30.000Z"),
      ),
    ).toEqual({ pausedSeconds: 100 });
  });
});
