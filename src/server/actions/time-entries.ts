"use server";

import prisma from "@/lib/prisma";
import { revalidateMutation } from "@/lib/cache-revalidate";
import { z } from "zod";
import { TimerCalculator } from "@/lib/timer-calculator";
import { resolveDefaultBillableServer } from "@/server/billable/resolve";
import { resolveEntryLinkageWithPrisma } from "@/server/invoice-linkage";
import { findOverlappingEntryIds } from "@/server/data/time-entries";
import { splitDurations, splitEntryAt } from "@/lib/tracking";
import {
  invoiceBlockAfterProjectChange,
  invoiceBlockOnStop,
  isPrismaUniqueConflict,
  startTimerInTransaction,
} from "@/lib/invoice-integrity";
import { InvoiceBlockStatus } from "@prisma/client";

// Validation Schemas
const idSchema = z.string().uuid("Invalid ID format");

const startTimerSchema = z.object({
  projectId: z.string().uuid().nullable(),
  description: z.string().max(500, "Description must be 500 characters or less"),
  isBillable: z.boolean().optional(),
});

const logManualEntrySchema = z.object({
  projectId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable().optional(),
  description: z.string().max(500, "Description must be 500 characters or less"),
  startTime: z.date(),
  endTime: z.date(),
  isBillable: z.boolean().optional(),
  rateOverride: z.number().nullable().optional(),
  confirmOverlap: z.boolean().optional(),
});

const updateTimeEntrySchema = z.object({
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  projectId: z.string().uuid().nullable().optional(),
  startTime: z.date().optional(),
  endTime: z.date().nullable().optional(),
  isBillable: z.boolean().optional(),
  rateOverride: z.number().nullable().optional(),
  confirmOverlap: z.boolean().optional(),
});

export type TimeEntrySnapshot = {
  projectId: string | null;
  clientId: string | null;
  invoiceBlockId: string | null;
  description: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  isBillable: boolean;
  rateOverride: number | null;
  pausedSeconds: number;
};

function revalidateTimePaths() {
  revalidateMutation("entry-write");
}

export async function startTimer(
  projectId: string | null,
  description: string,
  options?: { isBillable?: boolean },
) {
  const parsed = startTimerSchema.safeParse({
    projectId,
    description,
    isBillable: options?.isBillable,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const { clientId: resolvedClientId, invoiceBlockId: linkedInvoiceBlockId } = await resolveEntryLinkageWithPrisma(prisma, {
      projectId: parsed.data.projectId,
    });
    const resolvedBillable = parsed.data.isBillable ?? await resolveDefaultBillableServer(prisma, {
      projectId: parsed.data.projectId,
      clientId: resolvedClientId,
    });

    const attempt = async () =>
      prisma.$transaction(
        async (tx) =>
          startTimerInTransaction(tx, {
            projectId: parsed.data.projectId,
            description: parsed.data.description,
            isBillable: resolvedBillable,
            clientId: resolvedClientId,
            invoiceBlockId: linkedInvoiceBlockId,
            now: new Date(),
          }),
        { isolationLevel: "Serializable" },
      );

    let created: { id: string };
    try {
      created = await attempt();
    } catch (error) {
      if (!isPrismaUniqueConflict(error)) throw error;
      created = await attempt();
    }

    revalidateMutation("start");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("Failed to start timer:", error);
    return { success: false, error: "Failed to start timer" };
  }
}

export async function stopTimer(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: parsed.data } });
    if (!entry) return { success: false, error: "Entry not found" };

    const endTime = new Date();
    const { pausedSeconds, duration } = TimerCalculator.finalizeStop(entry, endTime);

    const stamped = entry.invoiceBlockId
      ? await prisma.invoiceBlock.findUnique({
          where: { id: entry.invoiceBlockId },
          select: { status: true },
        })
      : null;
    const linkage = await resolveEntryLinkageWithPrisma(prisma, {
      projectId: entry.projectId,
      fallbackClientId: entry.clientId,
    });
    const nextBlockId = invoiceBlockOnStop({
      stampedBlockId: entry.invoiceBlockId,
      stampedBlockIsActive: stamped?.status === InvoiceBlockStatus.ACTIVE,
      resolvedBlockId: linkage.invoiceBlockId,
    });

    await prisma.timeEntry.update({
      where: { id: parsed.data },
      data: {
        endTime,
        duration,
        pausedAt: null,
        pausedSeconds,
        invoiceBlockId: nextBlockId,
        clientId: linkage.clientId,
      }
    });

    revalidateMutation("stop");
    return { success: true };
  } catch (error) {
    console.error("Failed to stop timer:", error);
    return { success: false, error: "Failed to stop timer" };
  }
}

export async function logManualTimeEntry(data: {
  projectId: string | null;
  clientId?: string | null;
  description: string;
  startTime: Date;
  endTime: Date;
  isBillable: boolean;
  rateOverride?: number | null;
  confirmOverlap?: boolean;
}) {
  const parsed = logManualEntrySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { projectId, clientId, description, startTime, endTime, rateOverride } = parsed.data;
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  if (durationSeconds < 0) {
    return { success: false, error: "End time cannot be before start time" };
  }

  try {
    const overlappingIds = await findOverlappingEntryIds(startTime, endTime);
    if (overlappingIds.length > 0 && !parsed.data.confirmOverlap) {
      return {
        success: false,
        error: "This range overlaps another entry. Save anyway?",
        code: "OVERLAP" as const,
        overlappingIds,
      };
    }
    const { clientId: resolvedClientId, invoiceBlockId: linkedInvoiceBlockId } = await resolveEntryLinkageWithPrisma(prisma, {
      projectId,
      fallbackClientId: clientId ?? null,
    });
    const resolvedBillable = parsed.data.isBillable ?? await resolveDefaultBillableServer(prisma, {
      projectId,
      clientId: resolvedClientId,
    });

    await prisma.timeEntry.create({
      data: {
        projectId,
        clientId: resolvedClientId,
        invoiceBlockId: linkedInvoiceBlockId,
        description,
        startTime,
        endTime,
        duration: durationSeconds,
        isBillable: resolvedBillable,
        ...(rateOverride !== undefined && { rateOverride }),
      }
    });

    revalidateTimePaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to log manual entry:", error);
    return { success: false, error: "Failed to log entry" };
  }
}

export async function deleteTimeEntry(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  try {
    const existing = await prisma.timeEntry.findUnique({ where: { id: parsed.data } });
    if (!existing) return { success: false, error: "Entry not found" };

    await prisma.timeEntry.delete({
      where: { id: parsed.data }
    });
    revalidateTimePaths();
    const snapshot: TimeEntrySnapshot = {
      projectId: existing.projectId,
      clientId: existing.clientId,
      invoiceBlockId: existing.invoiceBlockId,
      description: existing.description ?? "",
      startTime: existing.startTime.toISOString(),
      endTime: existing.endTime ? existing.endTime.toISOString() : null,
      duration: existing.duration,
      isBillable: existing.isBillable,
      rateOverride: existing.rateOverride,
      pausedSeconds: existing.pausedSeconds,
    };
    return { success: true, snapshot };
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

export async function restoreTimeEntry(snapshot: TimeEntrySnapshot) {
  try {
    if (!snapshot.startTime) {
      return { success: false, error: "Invalid snapshot" };
    }
    await prisma.timeEntry.create({
      data: {
        projectId: snapshot.projectId,
        clientId: snapshot.clientId,
        invoiceBlockId: snapshot.invoiceBlockId,
        description: snapshot.description,
        startTime: new Date(snapshot.startTime),
        endTime: snapshot.endTime ? new Date(snapshot.endTime) : null,
        duration: snapshot.duration,
        isBillable: snapshot.isBillable,
        rateOverride: snapshot.rateOverride,
        pausedSeconds: snapshot.pausedSeconds ?? 0,
      },
    });
    revalidateTimePaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to restore entry:", error);
    return { success: false, error: "Failed to restore entry" };
  }
}

export async function duplicateTimeEntry(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  try {
    const existing = await prisma.timeEntry.findUnique({ where: { id: parsed.data } });
    if (!existing) return { success: false, error: "Entry not found" };
    if (!existing.endTime) {
      return { success: false, error: "Stop the timer before duplicating it" };
    }

    const created = await prisma.timeEntry.create({
      data: {
        projectId: existing.projectId,
        clientId: existing.clientId,
        invoiceBlockId: existing.invoiceBlockId,
        description: existing.description,
        startTime: existing.startTime,
        endTime: existing.endTime,
        duration: existing.duration,
        isBillable: existing.isBillable,
        rateOverride: existing.rateOverride,
        pausedSeconds: existing.pausedSeconds,
      },
    });
    revalidateTimePaths();
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("Failed to duplicate entry:", error);
    return { success: false, error: "Failed to duplicate entry" };
  }
}

export async function splitTimeEntry(id: string, splitAt: Date) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }
  if (Number.isNaN(splitAt.getTime())) {
    return { success: false, error: "Invalid split time" };
  }

  try {
    const existing = await prisma.timeEntry.findUnique({ where: { id: parsed.data } });
    if (!existing) return { success: false, error: "Entry not found" };
    if (!existing.endTime) {
      return { success: false, error: "Stop the timer before splitting it" };
    }

    const parts = splitEntryAt(existing.startTime, existing.endTime, splitAt);
    if (!parts) {
      return { success: false, error: "Split time must be inside the entry" };
    }

    const originalDuration = existing.duration ?? Math.max(
      0,
      Math.floor((existing.endTime.getTime() - existing.startTime.getTime()) / 1000),
    );
    const firstSeconds = Math.floor((parts.first.end.getTime() - parts.first.start.getTime()) / 1000);
    const durations = splitDurations(originalDuration, firstSeconds);
    if (!durations) {
      return { success: false, error: "Split time must be inside the entry" };
    }

    await prisma.$transaction([
      prisma.timeEntry.update({
        where: { id: parsed.data },
        data: {
          endTime: parts.first.end,
          duration: durations.first,
          pausedAt: null,
        },
      }),
      prisma.timeEntry.create({
        data: {
          projectId: existing.projectId,
          clientId: existing.clientId,
          invoiceBlockId: existing.invoiceBlockId,
          description: existing.description,
          startTime: parts.second.start,
          endTime: parts.second.end,
          duration: durations.second,
          isBillable: existing.isBillable,
          rateOverride: existing.rateOverride,
        },
      }),
    ]);

    revalidateTimePaths();
    return { success: true, data: { first: durations.first, second: durations.second } };
  } catch (error) {
    console.error("Failed to split entry:", error);
    return { success: false, error: "Failed to split entry" };
  }
}

export async function updateTimeEntry(id: string, data: {
  description?: string;
  projectId?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  isBillable?: boolean;
  rateOverride?: number | null;
  confirmOverlap?: boolean;
}) {
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  const dataParsed = updateTimeEntrySchema.safeParse(data);
  if (!dataParsed.success) {
    return { success: false, error: dataParsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id: idParsed.data }
    });

    if (!existingEntry) {
      return { success: false, error: "Entry not found" };
    }

    const { description, projectId, startTime, endTime, isBillable, rateOverride, confirmOverlap } = dataParsed.data;
    const linkage = projectId !== undefined
      ? await resolveEntryLinkageWithPrisma(prisma, { projectId })
      : null;
    const linkedInvoiceBlockId = linkage?.invoiceBlockId ?? null;
    const resolvedClientId = linkage?.clientId ?? null;

    // Recalculate duration if times changed
    const newStartTime = startTime ?? existingEntry.startTime;
    const newEndTime = endTime !== undefined ? endTime : existingEntry.endTime;

    if (newEndTime && (startTime !== undefined || endTime !== undefined)) {
      const overlappingIds = await findOverlappingEntryIds(newStartTime, newEndTime, idParsed.data);
      if (overlappingIds.length > 0 && !confirmOverlap) {
        return {
          success: false,
          error: "This range overlaps another entry. Save anyway?",
          code: "OVERLAP" as const,
          overlappingIds,
        };
      }
    }

    let duration = existingEntry.duration;
    if (newEndTime) {
      // finalizeStop flushes any active pause window so the gap between
      // pausedAt and newEndTime doesn't count toward duration.
      duration = TimerCalculator.finalizeStop(
        {
          startTime: newStartTime,
          endTime: null,
          pausedAt: existingEntry.pausedAt,
          pausedSeconds: existingEntry.pausedSeconds,
        },
        newEndTime,
      ).duration;
      if (duration < 0) {
        return { success: false, error: "End time cannot be before start time" };
      }
    }

    await prisma.timeEntry.update({
      where: { id: idParsed.data },
      data: {
        ...(description !== undefined && { description }),
        ...(projectId !== undefined && { projectId }),
        ...(projectId !== undefined && { clientId: resolvedClientId }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(isBillable !== undefined && { isBillable }),
        ...(rateOverride !== undefined && { rateOverride }),
        ...(projectId !== undefined && {
          invoiceBlockId: invoiceBlockAfterProjectChange({
            projectChanged: projectId !== existingEntry.projectId,
            previousInvoiceBlockId: existingEntry.invoiceBlockId,
            resolvedInvoiceBlockId: linkedInvoiceBlockId,
          }),
        }),
        ...(newEndTime && { duration }),
        ...(endTime !== undefined && endTime !== null && { pausedAt: null }),
      }
    });

    revalidateTimePaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to update entry:", error);
    return { success: false, error: "Failed to update entry" };
  }
}

export async function pauseTimer(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: parsed.data } });
    if (!entry) return { success: false, error: "Entry not found" };
    if (entry.endTime) return { success: false, error: "Entry already stopped" };
    if (entry.pausedAt) return { success: true };

    await prisma.timeEntry.update({
      where: { id: parsed.data },
      data: {
        pausedAt: new Date()
      }
    });

    revalidateMutation("pause");
    return { success: true };
  } catch (error) {
    console.error("Failed to pause timer:", error);
    return { success: false, error: "Failed to pause timer" };
  }
}

export async function resumeTimer(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: parsed.data } });
    if (!entry) return { success: false, error: "Entry not found" };
    if (entry.endTime) return { success: false, error: "Entry already stopped" };
    if (!entry.pausedAt) return { success: true };

    const now = new Date();
    const { pausedSeconds } = TimerCalculator.finalizeResume(entry, now);

    await prisma.timeEntry.update({
      where: { id: parsed.data },
      data: {
        pausedAt: null,
        pausedSeconds,
      }
    });

    revalidateMutation("resume");
    return { success: true };
  } catch (error) {
    console.error("Failed to resume timer:", error);
    return { success: false, error: "Failed to resume timer" };
  }
}
