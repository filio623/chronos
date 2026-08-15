"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isThemeMode, THEME_MODES, themeModeLabel } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = isThemeMode(theme) ? theme : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 dark:text-slate-400"
          aria-label={`Theme: ${themeModeLabel(current)}`}
        >
          <Sun size={16} className="dark:hidden" />
          <Moon size={16} className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_MODES.map((mode) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => setTheme(mode)}
            data-active={current === mode ? "true" : undefined}
          >
            {themeModeLabel(mode)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
