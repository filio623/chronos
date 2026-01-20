"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function startTimer(projectId: string | null, description: string) {
  try {
    // 1. Stop any currently running timers first (sanity check)
    await prisma.timeEntry.updateMany({
      where: { endTime: null },
      data: { 
        endTime: new Date(),
      }
    });

    // 2. Start new entry
    await prisma.timeEntry.create({
      data: {
        projectId,
        description,
        startTime: new Date(),
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to start timer:", error);
    return { success: false };
  }
}

export async function stopTimer(id: string) {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) return { success: false };

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

    await prisma.timeEntry.update({
      where: { id },
      data: { 
        endTime,
        duration: durationSeconds
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to stop timer:", error);
    return { success: false };
  }
}

export async function logManualTimeEntry(data: {
  projectId: string | null;
  description: string;
  startTime: Date;
  endTime: Date;
  isBillable: boolean;
}) {
  try {
    const durationSeconds = Math.floor((data.endTime.getTime() - data.startTime.getTime()) / 1000);
    
    if (durationSeconds < 0) {
      return { success: false, error: "End time cannot be before start time" };
    }

    await prisma.timeEntry.create({
      data: {
        projectId: data.projectId,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: durationSeconds,
        isBillable: data.isBillable,
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
  try {
    await prisma.timeEntry.delete({
      where: { id }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return { success: false };
  }
}
