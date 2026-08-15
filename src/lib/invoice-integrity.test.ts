import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { InvoiceBlockStatus } from "@prisma/client";
import {
  ACTIVE_BLOCK_ALREADY_EXISTS,
  ACTIVE_BLOCK_UNIQUE_INDEX,
  RUNNING_TIMER_UNIQUE_INDEX,
  assignProjectEntriesWhere,
  canDeleteInvoiceBlock,
  canTransitionInvoiceStatus,
  hoursTargetSchema,
  invoiceBlockAfterProjectChange,
  invoiceBlockOnStop,
  isPrismaUniqueConflict,
  mapActiveBlockUniqueError,
  resetInvoiceBlockInTransaction,
  startTimerInTransaction,
  workOptionsRejectReason,
} from "./invoice-integrity";

const MIGRATION = resolve(
  process.cwd(),
  "prisma/migrations/20260815120000_phase3_uniques/migration.sql",
);

describe("hoursTargetSchema", () => {
  it("matches create-block bounds", () => {
    expect(hoursTargetSchema.safeParse(0.5).success).toBe(true);
    expect(hoursTargetSchema.safeParse(0.4).success).toBe(false);
    expect(hoursTargetSchema.safeParse(10001).success).toBe(false);
  });
});

describe("status and delete rules", () => {
  it("only allows Completed → Submitted → Paid", () => {
    expect(canTransitionInvoiceStatus(InvoiceBlockStatus.COMPLETED, InvoiceBlockStatus.SUBMITTED)).toBe(true);
    expect(canTransitionInvoiceStatus(InvoiceBlockStatus.SUBMITTED, InvoiceBlockStatus.PAID)).toBe(true);
    expect(canTransitionInvoiceStatus(InvoiceBlockStatus.COMPLETED, InvoiceBlockStatus.PAID)).toBe(false);
    expect(canTransitionInvoiceStatus(InvoiceBlockStatus.ACTIVE, InvoiceBlockStatus.COMPLETED)).toBe(false);
    expect(canTransitionInvoiceStatus(InvoiceBlockStatus.PAID, InvoiceBlockStatus.SUBMITTED)).toBe(false);
  });

  it("refuses deleting PAID unless forced", () => {
    expect(canDeleteInvoiceBlock(InvoiceBlockStatus.PAID)).toBe(false);
    expect(canDeleteInvoiceBlock(InvoiceBlockStatus.PAID, true)).toBe(true);
    expect(canDeleteInvoiceBlock(InvoiceBlockStatus.COMPLETED)).toBe(true);
  });
});

describe("membership policy", () => {
  it("relinks (move or clear) when the project changes", () => {
    expect(
      invoiceBlockAfterProjectChange({
        projectChanged: true,
        previousInvoiceBlockId: "old-block",
        resolvedInvoiceBlockId: "new-block",
      }),
    ).toBe("new-block");
    expect(
      invoiceBlockAfterProjectChange({
        projectChanged: true,
        previousInvoiceBlockId: "old-block",
        resolvedInvoiceBlockId: null,
      }),
    ).toBeNull();
    expect(
      invoiceBlockAfterProjectChange({
        projectChanged: false,
        previousInvoiceBlockId: "old-block",
        resolvedInvoiceBlockId: "new-block",
      }),
    ).toBe("old-block");
  });

  it("re-resolves on stop when the stamped block is no longer ACTIVE", () => {
    expect(
      invoiceBlockOnStop({
        stampedBlockId: "done",
        stampedBlockIsActive: false,
        resolvedBlockId: "next-active",
      }),
    ).toBe("next-active");
    expect(
      invoiceBlockOnStop({
        stampedBlockId: "still-active",
        stampedBlockIsActive: true,
        resolvedBlockId: "other",
      }),
    ).toBe("still-active");
  });

  it("rejects a work-options block that is not the client's", () => {
    expect(workOptionsRejectReason(null, "c1")).toBe("Invoice block not found");
    expect(workOptionsRejectReason({ clientId: "c2" }, "c1")).toBe(
      "Invoice block does not belong to this client",
    );
    expect(workOptionsRejectReason({ clientId: "c1" }, "c1")).toBeNull();
  });

  it("scopes project-branch assign to this client", () => {
    const where = assignProjectEntriesWhere("client-a", ["p1", "p2"]);
    expect(where.projectId).toEqual({ in: ["p1", "p2"] });
    expect(where.OR).toEqual([{ clientId: "client-a" }, { clientId: null }]);
    expect(where.invoiceBlockId).toBeNull();
  });
});

describe("unique-violation mapping", () => {
  it("maps Prisma P2002 to the existing active-block error", () => {
    expect(isPrismaUniqueConflict({ code: "P2002" })).toBe(true);
    expect(mapActiveBlockUniqueError({ code: "P2002" })).toBe(ACTIVE_BLOCK_ALREADY_EXISTS);
    expect(mapActiveBlockUniqueError(new Error("nope"))).toBeNull();
  });
});

describe("phase3 unique indexes", () => {
  it("commits partial unique indexes for one running timer and one ACTIVE block", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain(RUNNING_TIMER_UNIQUE_INDEX);
    expect(sql).toMatch(/WHERE "endTime" IS NULL/);
    expect(sql).toContain(ACTIVE_BLOCK_UNIQUE_INDEX);
    expect(sql).toMatch(/WHERE status = 'ACTIVE'/);
  });
});

describe("startTimerInTransaction", () => {
  it("finalizes any open row then inserts the new one", async () => {
    const ops: string[] = [];
    const created = await startTimerInTransaction(
      {
        timeEntry: {
          findMany: async () => {
            ops.push("find");
            return [
              {
                id: "open-1",
                startTime: new Date("2026-08-15T10:00:00"),
                pausedAt: null,
                pausedSeconds: 0,
              },
            ];
          },
          update: async (args) => {
            ops.push(`stop:${args.where.id}`);
            expect(args.data.endTime).toBeInstanceOf(Date);
            expect(args.data.duration).toBeGreaterThan(0);
          },
          create: async (args) => {
            ops.push("create");
            expect(args.data.startTime).toBeInstanceOf(Date);
            expect(args.data.description).toBe("New");
            return { id: "new-1" };
          },
        },
      },
      {
        projectId: "p1",
        description: "New",
        isBillable: true,
        clientId: "c1",
        invoiceBlockId: "b1",
        now: new Date("2026-08-15T11:00:00"),
      },
    );
    expect(created.id).toBe("new-1");
    expect(ops).toEqual(["find", "stop:open-1", "create"]);
  });
});

describe("resetInvoiceBlockInTransaction", () => {
  it("completes then creates in one callback; create failure leaves no next block", async () => {
    const ops: string[] = [];
    const result = await resetInvoiceBlockInTransaction(
      {
        invoiceBlock: {
          update: async (args) => {
            ops.push(`complete:${args.where.id}`);
            expect(args.data.status).toBe(InvoiceBlockStatus.COMPLETED);
          },
          create: async (args) => {
            ops.push("create-next");
            expect(args.data.hoursTarget).toBe(12);
            expect(args.data.hoursCarriedForward).toBe(2);
            expect(args.data.status).toBe(InvoiceBlockStatus.ACTIVE);
            return { id: "next-1" };
          },
        },
      },
      {
        blockId: "old",
        clientId: "c1",
        hoursCarriedForward: 0,
        hoursTarget: 10,
        carryOverage: true,
        newTargetHours: 12,
        blockHours: 12,
        now: new Date("2026-08-15T12:00:00"),
      },
    );
    expect(result.overage).toBe(2);
    expect(result.nextBlockId).toBe("next-1");
    expect(ops).toEqual(["complete:old", "create-next"]);
  });

  it("rolls back when next create throws (caller wraps in $transaction)", async () => {
    await expect(
      resetInvoiceBlockInTransaction(
        {
          invoiceBlock: {
            update: async () => undefined,
            create: async () => {
              throw new Error("create failed");
            },
          },
        },
        {
          blockId: "old",
          clientId: "c1",
          hoursCarriedForward: 0,
          hoursTarget: 10,
          carryOverage: false,
          newTargetHours: 8,
          blockHours: 4,
          now: new Date(),
        },
      ),
    ).rejects.toThrow("create failed");
  });
});
