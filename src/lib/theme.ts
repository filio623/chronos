export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export function themeModeLabel(mode: ThemeMode): string {
  if (mode === "light") return "Light";
  if (mode === "dark") return "Dark";
  return "System";
}
