import { describe, expect, it } from "vitest";
import { THEME_MODES, isThemeMode, themeModeLabel } from "./theme";

describe("theme modes", () => {
  it("accepts light, dark, and system only", () => {
    expect(THEME_MODES).toEqual(["light", "dark", "system"]);
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("auto")).toBe(false);
    expect(themeModeLabel("system")).toBe("System");
  });
});
