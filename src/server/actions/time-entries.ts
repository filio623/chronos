"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TimerCalculator } from "@/lib/timer-calculator";
import { resolveDefaultBillableServer } from "@/server/billable/resolve";
import { resolveEntryLinkageWithPrisma } from "@/server/invoice-linkage";

// Validation Schemas
const idSchema = z.string().uuid("Invalid ID format");

const startTimerSchema = z.object({
  projectId: z.string().uuid().nullable(),
  description: z.string().max(500, "Description must be 500 characters or less"),
});

const logManualEntrySchema = z.object({
  projectId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable().optional(),
  description: z.string().max(500, "Description must be 500 characters or less"),
  startTime: z.date(),
  endTime: z.date(),
  isBillable: z.boolean().optional(),
  rateOverride: z.number().nullable().optional(),
});

const updateTimeEntrySchema = z.object({
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  projectId: z.string().uuid().nullable().optional(),
  startTime: z.date().optional(),
  endTime: z.date().nullable().optional(),
  isBillable: z.boolean().optional(),
  rateOverride: z.number().nullable().optional(),
});

export async function startTimer(projectId: string | null, description: string) {
  const parsed = startTimerSchema.safeParse({ projectId, description });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const endTime = new Date();

    // 1. Stop any currently running timers first (sanity check)
    // Fetch active entries first to calculate duration for each
    const activeEntries = await prisma.timeEntry.findMany({
      where: { endTime: null },
      select: { id: true, startTime: true, pausedAt: true, pausedSeconds: true }
    });

    // Update each active entry with calculated duration
    if (activeEntries.length > 0) {
      await Promise.all(
        activeEntries.map(entry => {
          const { pausedSeconds, duration } = TimerCalculator.finalizeStop({ ...entry, endTime: null }, endTime);
          return prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
              endTime,
              duration,
              pausedAt: null,
              pausedSeconds,
            }
          });
        })
      );
    }

    // 2. Start new entry
    const { clientId: resolvedClientId, invoiceBlockId: linkedInvoiceBlockId } = await resolveEntryLinkageWithPrisma(prisma, {
      projectId: parsed.data.projectId,
    });
    const resolvedBillable = await resolveDefaultBillableServer(prisma, {
      projectId: parsed.data.projectId,
      clientId: resolvedClientId,
    });

    await prisma.timeEntry.create({
      data: {
        projectId: parsed.data.projectId,
        clientId: resolvedClientId,
        invoiceBlockId: linkedInvoiceBlockId,
        description: parsed.data.description,
        startTime: new Date(),
        isBillable: resolvedBillable,
      }
    });

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
    revalidatePath("/reports");
    return { success: true };
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

    await prisma.timeEntry.update({
      where: { id: parsed.data },
      data: {
        endTime,
        duration,
        pausedAt: null,
        pausedSeconds,
      }
    });

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
    revalidatePath("/reports");
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

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
    revalidatePath("/reports");
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
    await prisma.timeEntry.delete({
      where: { id: parsed.data }
    });
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
    revalidatePath("/reports");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

export async function updateTimeEntry(id: string, data: {
  description?: string;
  projectId?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  isBillable?: boolean;
  rateOverride?: number | null;
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

    const { description, projectId, startTime, endTime, isBillable, rateOverride } = dataParsed.data;
    const linkage = projectId !== undefined
      ? await resolveEntryLinkageWithPrisma(prisma, { projectId })
      : null;
    const linkedInvoiceBlockId = linkage?.invoiceBlockId ?? null;
    const resolvedClientId = linkage?.clientId ?? null;

    // Recalculate duration if times changed
    const newStartTime = startTime ?? existingEntry.startTime;
    const newEndTime = endTime !== undefined ? endTime : existingEntry.endTime;

    let duration = existingEntry.duration;
    if (newEndTime) {
      duration = TimerCalculator.recomputeDuration({
        startTime: newStartTime,
        endTime: newEndTime,
        pausedAt: existingEntry.pausedAt,
        pausedSeconds: existingEntry.pausedSeconds,
      });
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
        ...(projectId !== undefined && existingEntry.invoiceBlockId === null && { invoiceBlockId: linkedInvoiceBlockId }),
        ...(newEndTime && { duration }),
        ...(endTime !== undefined && endTime !== null && { pausedAt: null }),
      }
    });

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
    revalidatePath("/reports");
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

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
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

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/tracker");
    revalidatePath("/timesheet");
    return { success: true };
  } catch (error) {
    console.error("Failed to resume timer:", error);
    return { success: false, error: "Failed to resume timer" };
  }
}
