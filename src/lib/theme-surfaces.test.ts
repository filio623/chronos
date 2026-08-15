import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("dark-readable named views", () => {
  it("timesheet list, grid header, and grand total have dark counterparts", () => {
    const text = source("src/components/custom/TimesheetView.tsx");
    expect(text).toMatch(/data-testid="timesheet-entry-desc"[\s\S]{0,240}dark:text-slate-100/);
    expect(text).toMatch(/data-testid="timesheet-grid-header"[\s\S]{0,240}dark:bg-slate-800/);
    expect(text).toMatch(/data-testid="timesheet-grand-total"[\s\S]{0,240}dark:text-slate-100/);
  });

  it("reports row time/amount, group-by bar, and donut panel have dark counterparts", () => {
    const text = source("src/components/custom/ReportsView.tsx");
    expect(text).toMatch(/data-testid="report-row-time"[\s\S]{0,240}dark:text-slate-100/);
    expect(text).toMatch(/data-testid="report-row-amount"[\s\S]{0,240}dark:text-slate-200/);
    expect(text).toMatch(/data-testid="report-groupby"[\s\S]{0,240}dark:bg-slate-800/);
    expect(text).toMatch(/data-testid="report-donut"[\s\S]{0,240}dark:bg-slate-900/);
  });

  it("tracker/dashboard entry descriptions have dark text", () => {
    const text = source("src/components/custom/TimeEntryRow.tsx");
    expect(text).toMatch(/data-testid="entry-description"[\s\S]{0,240}dark:text-slate-100/);
  });
});
