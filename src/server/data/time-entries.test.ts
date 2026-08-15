import { describe, expect, it } from "vitest";
import { buildTimeEntryListArgs } from "./time-entries";

describe("buildTimeEntryListArgs", () => {
  it("builds a week range without a 50-row cap", () => {
    const start = new Date(2026, 0, 4);
    const endExclusive = new Date(2026, 0, 11);
    const args = buildTimeEntryListArgs({ startTimeGte: start, startTimeLt: endExclusive });
    expect(args.where.startTime).toEqual({ gte: start, lt: endExclusive });
    expect(args.take).toBeUndefined();
    expect(args.skip).toBeUndefined();
  });

  it("paginates tracker lists", () => {
    const args = buildTimeEntryListArgs({ page: 2, pageSize: 50 });
    expect(args.skip).toBe(50);
    expect(args.take).toBe(50);
  });
});
