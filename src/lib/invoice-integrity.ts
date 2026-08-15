import { z } from "zod";
import { InvoiceBlockStatus } from "@prisma/client";
import { TimerCalculator } from "@/lib/timer-calculator";

export const hoursTargetSchema = z
  .number()
  .min(0.5, "Hours target must be at least 0.5")
  .max(10000, "Hours target too large");

export const ACTIVE_BLOCK_ALREADY_EXISTS =
  "Client already has an active invoice block. Please complete it first.";

export const RUNNING_TIMER_UNIQUE_INDEX = "TimeEntry_one_running_key";
export const ACTIVE_BLOCK_UNIQUE_INDEX = "InvoiceBlock_one_active_per_client_key";

export function isPrismaUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002",
  );
}

export function mapActiveBlockUniqueError(error: unknown): string | null {
  return isPrismaUniqueConflict(error) ? ACTIVE_BLOCK_ALREADY_EXISTS : null;
}

export function canTransitionInvoiceStatus(
  from: InvoiceBlockStatus,
  to: InvoiceBlockStatus,
): boolean {
  if (from === InvoiceBlockStatus.COMPLETED && to === InvoiceBlockStatus.SUBMITTED) return true;
  if (from === InvoiceBlockStatus.SUBMITTED && to === InvoiceBlockStatus.PAID) return true;
  return false;
}

export function canDeleteInvoiceBlock(status: InvoiceBlockStatus, force = false): boolean {
  if (status === InvoiceBlockStatus.PAID && !force) return false;
  return true;
}

/** Policy: relink. Project change always takes the newly resolved block (move or clear). */
export function invoiceBlockAfterProjectChange(input: {
  projectChanged: boolean;
  previousInvoiceBlockId: string | null;
  resolvedInvoiceBlockId: string | null;
}): string | null {
  if (!input.projectChanged) return input.previousInvoiceBlockId;
  return input.resolvedInvoiceBlockId;
}

/** Keep the stamp only while that block is still ACTIVE; otherwise re-resolve. */
export function invoiceBlockOnStop(input: {
  stampedBlockId: string | null;
  stampedBlockIsActive: boolean;
  resolvedBlockId: string | null;
}): string | null {
  if (input.stampedBlockId && input.stampedBlockIsActive) return input.stampedBlockId;
  return input.resolvedBlockId;
}

export function workOptionsRejectReason(
  block: { clientId: string } | null,
  clientId: string,
): string | null {
  if (!block) return "Invoice block not found";
  if (block.clientId !== clientId) return "Invoice block does not belong to this client";
  return null;
}

/** Project-branch assign must not pull another client's entries. */
export function assignProjectEntriesWhere(clientId: string, projectIds: string[]) {
  return {
    projectId: { in: projectIds },
    endTime: { not: null },
    invoiceBlockId: null,
    OR: [{ clientId }, { clientId: null }],
  };
}

export type StartTimerTx = {
  timeEntry: {
    findMany: (args: {
      where: { endTime: null };
      select: { id: true; startTime: true; pausedAt: true; pausedSeconds: true };
    }) => Promise<Array<{ id: string; startTime: Date; pausedAt: Date | null; pausedSeconds: number }>>;
    update: (args: {
      where: { id: string };
      data: { endTime: Date; duration: number; pausedAt: null; pausedSeconds: number };
    }) => Promise<unknown>;
    create: (args: {
      data: {
        projectId: string | null;
        clientId: string | null;
        invoiceBlockId: string | null;
        description: string;
        startTime: Date;
        isBillable: boolean;
      };
    }) => Promise<{ id: string }>;
  };
};

export async function startTimerInTransaction(
  tx: StartTimerTx,
  input: {
    projectId: string | null;
    description: string;
    isBillable: boolean;
    clientId: string | null;
    invoiceBlockId: string | null;
    now: Date;
  },
): Promise<{ id: string }> {
  const open = await tx.timeEntry.findMany({
    where: { endTime: null },
    select: { id: true, startTime: true, pausedAt: true, pausedSeconds: true },
  });

  for (const entry of open) {
    const { pausedSeconds, duration } = TimerCalculator.finalizeStop(
      { ...entry, endTime: null },
      input.now,
    );
    await tx.timeEntry.update({
      where: { id: entry.id },
      data: {
        endTime: input.now,
        duration,
        pausedAt: null,
        pausedSeconds,
      },
    });
  }

  return tx.timeEntry.create({
    data: {
      projectId: input.projectId,
      clientId: input.clientId,
      invoiceBlockId: input.invoiceBlockId,
      description: input.description,
      startTime: input.now,
      isBillable: input.isBillable,
    },
  });
}

export type ResetBlockTx = {
  invoiceBlock: {
    update: (args: {
      where: { id: string };
      data: { status: InvoiceBlockStatus; endDate: Date };
    }) => Promise<unknown>;
    create: (args: {
      data: {
        clientId: string;
        hoursTarget: number;
        hoursCarriedForward: number;
        status: InvoiceBlockStatus;
      };
    }) => Promise<{ id: string }>;
  };
};

export async function resetInvoiceBlockInTransaction(
  tx: ResetBlockTx,
  input: {
    blockId: string;
    clientId: string;
    hoursCarriedForward: number;
    hoursTarget: number;
    carryOverage: boolean;
    newTargetHours?: number;
    blockHours: number;
    now: Date;
  },
): Promise<{ overage: number; nextBlockId: string | null }> {
  const effectiveTracked = input.blockHours + input.hoursCarriedForward;
  const overage = Math.max(0, effectiveTracked - input.hoursTarget);

  await tx.invoiceBlock.update({
    where: { id: input.blockId },
    data: {
      status: InvoiceBlockStatus.COMPLETED,
      endDate: input.now,
    },
  });

  if (input.newTargetHours === undefined) {
    return { overage, nextBlockId: null };
  }

  const next = await tx.invoiceBlock.create({
    data: {
      clientId: input.clientId,
      hoursTarget: input.newTargetHours,
      hoursCarriedForward: input.carryOverage ? overage : 0,
      status: InvoiceBlockStatus.ACTIVE,
    },
  });
  return { overage, nextBlockId: next.id };
}
