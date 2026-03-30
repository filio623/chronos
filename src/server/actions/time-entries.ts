"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { InvoiceBlockStatus } from "@prisma/client";
import { z } from "zod";

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

async function resolveDefaultBillable(projectId: string | null, clientId?: string | null) {
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        defaultBillable: true,
        clientId: true,
        client: { select: { defaultBillable: true } },
      },
    });
    if (project?.defaultBillable !== null && project?.defaultBillable !== undefined) {
      return project.defaultBillable;
    }
    if (project?.client?.defaultBillable !== undefined) {
      return project.client.defaultBillable;
    }
    if (project?.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: project.clientId },
        select: { defaultBillable: true },
      });
      if (client?.defaultBillable !== undefined) return client.defaultBillable;
    }
  }

  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { defaultBillable: true },
    });
    if (client?.defaultBillable !== undefined) return client.defaultBillable;
  }

  return true;
}

function calculatePausedSeconds(params: {
  pausedAt: Date | null;
  pausedSeconds: number | null;
  endTime: Date;
}) {
  const basePaused = params.pausedSeconds ?? 0;
  if (!params.pausedAt) return basePaused;
  const extra = Math.floor((params.endTime.getTime() - params.pausedAt.getTime()) / 1000);
  return basePaused + Math.max(0, extra);
}

function calculateDurationSeconds(params: {
  startTime: Date;
  endTime: Date;
  pausedSeconds: number;
}) {
  const totalSeconds = Math.floor((params.endTime.getTime() - params.startTime.getTime()) / 1000);
  return Math.max(0, totalSeconds - params.pausedSeconds);
}

async function resolveEntryLinkage(params: {
  projectId: string | null;
  fallbackClientId?: string | null;
}): Promise<{ clientId: string | null; invoiceBlockId: string | null }> {
  let resolvedClientId = params.fallbackClientId ?? null;

  if (params.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { clientId: true },
    });

    resolvedClientId = project?.clientId ?? resolvedClientId;

    const linked = await prisma.invoiceBlockProject.findFirst({
      where: {
        projectId: params.projectId,
        invoiceBlock: {
          status: InvoiceBlockStatus.ACTIVE,
        },
      },
      select: {
        invoiceBlockId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (linked?.invoiceBlockId) {
      return {
        clientId: resolvedClientId,
        invoiceBlockId: linked.invoiceBlockId,
      };
    }
  }

  if (!resolvedClientId) {
    return {
      clientId: null,
      invoiceBlockId: null,
    };
  }

  const activeBlock = await prisma.invoiceBlock.findFirst({
    where: {
      clientId: resolvedClientId,
      status: InvoiceBlockStatus.ACTIVE,
    },
    select: {
      id: true,
      projectAssignments: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const isProjectScoped = (activeBlock?.projectAssignments.length ?? 0) > 0;

  return {
    clientId: resolvedClientId,
    invoiceBlockId: activeBlock && !isProjectScoped ? activeBlock.id : null,
  };
}

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
          const totalPausedSeconds = calculatePausedSeconds({
            pausedAt: entry.pausedAt,
            pausedSeconds: entry.pausedSeconds,
            endTime
          });
          const durationSeconds = calculateDurationSeconds({
            startTime: entry.startTime,
            endTime,
            pausedSeconds: totalPausedSeconds
          });
          return prisma.timeEntry.update({
            where: { id: entry.id },
            data: {
              endTime,
              duration: durationSeconds,
              pausedAt: null,
              pausedSeconds: totalPausedSeconds
            }
          });
        })
      );
    }

    // 2. Start new entry
    const { clientId: resolvedClientId, invoiceBlockId: linkedInvoiceBlockId } = await resolveEntryLinkage({
      projectId: parsed.data.projectId,
    });
    const resolvedBillable = await resolveDefaultBillable(parsed.data.projectId, resolvedClientId);

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
    const totalPausedSeconds = calculatePausedSeconds({
      pausedAt: entry.pausedAt,
      pausedSeconds: entry.pausedSeconds,
      endTime
    });
    const durationSeconds = calculateDurationSeconds({
      startTime: entry.startTime,
      endTime,
      pausedSeconds: totalPausedSeconds
    });

    await prisma.timeEntry.update({
      where: { id: parsed.data },
      data: {
        endTime,
        duration: durationSeconds,
        pausedAt: null,
        pausedSeconds: totalPausedSeconds
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
    const { clientId: resolvedClientId, invoiceBlockId: linkedInvoiceBlockId } = await resolveEntryLinkage({
      projectId,
      fallbackClientId: clientId ?? null,
    });
    const resolvedBillable = parsed.data.isBillable ?? await resolveDefaultBillable(projectId, resolvedClientId);

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
      ? await resolveEntryLinkage({ projectId })
      : null;
    const linkedInvoiceBlockId = linkage?.invoiceBlockId ?? null;
    const resolvedClientId = linkage?.clientId ?? null;

    // Recalculate duration if times changed
    const newStartTime = startTime ?? existingEntry.startTime;
    const newEndTime = endTime !== undefined ? endTime : existingEntry.endTime;

    let duration = existingEntry.duration;
    if (newEndTime) {
      const totalPausedSeconds = calculatePausedSeconds({
        pausedAt: existingEntry.pausedAt,
        pausedSeconds: existingEntry.pausedSeconds,
        endTime: newEndTime
      });
      duration = calculateDurationSeconds({
        startTime: newStartTime,
        endTime: newEndTime,
        pausedSeconds: totalPausedSeconds
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
    const pausedSeconds = calculatePausedSeconds({
      pausedAt: entry.pausedAt,
      pausedSeconds: entry.pausedSeconds,
      endTime: now
    });

    await prisma.timeEntry.update({
      where: { id: parsed.data },
      data: {
        pausedAt: null,
        pausedSeconds
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
