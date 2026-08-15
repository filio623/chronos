"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseWeekStartsOn } from "@/lib/time";
import { parseRoundingRule, serializeRoundingRule } from "@/lib/tracking";
import { ROUNDING_COOKIE, WEEK_STARTS_COOKIE } from "@/lib/prefs";

export async function setTrackingPrefs(input: {
  weekStartsOn?: 0 | 1 | "0" | "1";
  rounding?: string;
}) {
  const store = await cookies();
  if (input.weekStartsOn !== undefined) {
    const weekStartsOn = parseWeekStartsOn(String(input.weekStartsOn));
    store.set(WEEK_STARTS_COOKIE, String(weekStartsOn), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (input.rounding !== undefined) {
    const serialized = serializeRoundingRule(parseRoundingRule(input.rounding));
    store.set(ROUNDING_COOKIE, serialized, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  revalidatePath("/");
  revalidatePath("/timesheet");
  revalidatePath("/reports");
  revalidatePath("/tracker");
  return { success: true };
}
