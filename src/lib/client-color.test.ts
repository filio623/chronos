import { describe, expect, it } from "vitest";
import { resolveCreateClientColor } from "./client-color";

describe("resolveCreateClientColor", () => {
  it("stores the chosen swatch", () => {
    expect(
      resolveCreateClientColor({ submitted: "text-rose-600", nextAuto: "text-indigo-600" }),
    ).toBe("text-rose-600");
  });

  it("auto-assigns when color is omitted", () => {
    expect(resolveCreateClientColor({ submitted: null, nextAuto: "text-indigo-600" })).toBe("text-indigo-600");
    expect(resolveCreateClientColor({ submitted: "   ", nextAuto: "text-emerald-600" })).toBe("text-emerald-600");
  });
});
