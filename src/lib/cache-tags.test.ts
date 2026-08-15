import { describe, expect, it } from "vitest";
import { CACHE_TAGS, cachePlanFor } from "./cache-tags";

describe("cachePlanFor", () => {
  it("does not bust reports on pause or resume", () => {
    for (const kind of ["pause", "resume"] as const) {
      const plan = cachePlanFor(kind);
      expect(plan.tags).toEqual([CACHE_TAGS.timer]);
      expect(plan.paths).not.toContain("/reports");
      expect(plan.tags).not.toContain(CACHE_TAGS.reports);
    }
  });

  it("refreshes tracker, projects, and clients when assigning work", () => {
    const plan = cachePlanFor("assign-work");
    expect(plan.paths).toEqual(expect.arrayContaining(["/tracker", "/projects", "/clients"]));
    expect(plan.tags).toEqual(
      expect.arrayContaining([CACHE_TAGS.entries, CACHE_TAGS.projects, CACHE_TAGS.clients]),
    );
  });
});
