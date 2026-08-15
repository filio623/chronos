import { describe, expect, it } from "vitest";
import type { InvoiceBlock } from "@prisma/client";
import { enrichBlock } from "./block-hours-calculator";

const block: InvoiceBlock = {
  id: "b1",
  clientId: "c1",
  hoursTarget: 10,
  hoursCarriedForward: 2,
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: null,
  status: "ACTIVE",
  notes: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

describe("enrichBlock", () => {
  it("adds carried-forward hours to tracked time", () => {
    const enriched = enrichBlock(block, 3.5);
    expect(enriched.hoursTracked).toBe(5.5);
    expect(enriched.progressPercent).toBeCloseTo(55);
  });

  it("can exceed 100 percent when over the target", () => {
    expect(enrichBlock(block, 9).progressPercent).toBeCloseTo(110);
  });
});
