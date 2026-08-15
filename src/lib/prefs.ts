import { cookies } from "next/headers";
import { parseWeekStartsOn, type WeekStartsOn } from "@/lib/time";
import { parseRoundingRule, type RoundingRule } from "@/lib/tracking";

export const WEEK_STARTS_COOKIE = "chronos-week-starts-on";
export const ROUNDING_COOKIE = "chronos-rounding";

export type TrackingPrefs = {
  weekStartsOn: WeekStartsOn;
  rounding: RoundingRule;
};

export async function getTrackingPrefs(): Promise<TrackingPrefs> {
  const store = await cookies();
  return {
    weekStartsOn: parseWeekStartsOn(store.get(WEEK_STARTS_COOKIE)?.value),
    rounding: parseRoundingRule(store.get(ROUNDING_COOKIE)?.value),
  };
}
