"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation Schemas
const idSchema = z.string().uuid("Invalid ID format");

const startTimerSchema = z.object({
  projectId: z.string().uuid().nullable(),
  description: z.string().max(500, "Description must be 500 characters or less"),
});

const logManualEntrySchema = z.object({
  projectId: z.string().uuid().nullable(),
  description: z.string().max(500, "Description must be 500 characters or less"),
  startTime: z.date(),
  endTime: z.date(),
  isBillable: z.boolean().default(true),
});

const updateTimeEntrySchema = z.object({
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  projectId: z.string().uuid().nullable().optional(),
  startTime: z.date().optional(),
  endTime: z.date().nullable().optional(),
  isBillable: z.boolean().optional(),
});

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
    await prisma.timeEntry.create({
      data: {
        projectId: parsed.data.projectId,
        description: parsed.data.description,
        startTime: new Date(),
      }
    });

    revalidatePath("/");
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
    return { success: true };
  } catch (error) {
    console.error("Failed to stop timer:", error);
    return { success: false, error: "Failed to stop timer" };
  }
}

export async function logManualTimeEntry(data: {
  projectId: string | null;
  description: string;
  startTime: Date;
  endTime: Date;
  isBillable: boolean;
}) {
  const parsed = logManualEntrySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { projectId, description, startTime, endTime, isBillable } = parsed.data;
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  if (durationSeconds < 0) {
    return { success: false, error: "End time cannot be before start time" };
  }

  try {
    await prisma.timeEntry.create({
      data: {
        projectId,
        description,
        startTime,
        endTime,
        duration: durationSeconds,
        isBillable,
      }
    });

    revalidatePath("/");
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

    const { description, projectId, startTime, endTime, isBillable } = dataParsed.data;

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
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(isBillable !== undefined && { isBillable }),
        ...(newEndTime && { duration }),
        ...(endTime !== undefined && endTime !== null && { pausedAt: null }),
      }
    });

    revalidatePath("/");
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
    return { success: true };
  } catch (error) {
    console.error("Failed to resume timer:", error);
    return { success: false, error: "Failed to resume timer" };
  }
}
