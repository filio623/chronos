"use client";

import React, { useTransition } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setTrackingPrefs } from "@/server/actions/prefs";
import type { WeekStartsOn } from "@/lib/time";
import { serializeRoundingRule, type RoundingRule } from "@/lib/tracking";

const ROUNDING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "Exact seconds" },
  { value: "nearest-6", label: "Nearest 6 minutes" },
  { value: "up-6", label: "Round up 6 minutes" },
  { value: "nearest-15", label: "Nearest 15 minutes" },
  { value: "up-15", label: "Round up 15 minutes" },
];

export function TrackingPrefs({
  weekStartsOn,
  rounding,
}: {
  weekStartsOn: WeekStartsOn;
  rounding: RoundingRule;
}) {
  const [isPending, startTransition] = useTransition();

  const update = (input: { weekStartsOn?: 0 | 1; rounding?: string }) => {
    startTransition(async () => {
      const result = await setTrackingPrefs(input);
      if (!result.success) toast.error("Failed to save preference");
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500"
          aria-label="Tracking preferences"
        >
          <Settings2 size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="space-y-1">
          <Label>Week starts on</Label>
          <Select
            value={String(weekStartsOn)}
            disabled={isPending}
            onValueChange={(value) => update({ weekStartsOn: value === "1" ? 1 : 0 })}
          >
            <SelectTrigger aria-label="Week starts on">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Rounding</Label>
          <Select
            value={serializeRoundingRule(rounding)}
            disabled={isPending}
            onValueChange={(value) => update({ rounding: value })}
          >
            <SelectTrigger aria-label="Rounding rule">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUNDING_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
