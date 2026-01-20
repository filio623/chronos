import prisma from "@/lib/prisma";
import { TimeEntry } from "@prisma/client";

export async function getTimeEntries(limit = 50): Promise<TimeEntry[]> {
  try {
    const entries = await prisma.timeEntry.findMany({
      take: limit,
      orderBy: {
        startTime: 'desc',
      },
      include: {
        project: {
          include: {
            client: true
          }
        }
      }
    });
    return entries;
  } catch (error) {
    console.error("Failed to fetch time entries:", error);
    return [];
  }
}

export async function getActiveTimer(): Promise<TimeEntry | null> {
  try {
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        endTime: null
      },
      include: {
        project: true
      }
    });
    return activeEntry;
  } catch (error) {
    console.error("Failed to fetch active timer:", error);
    return null;
  }
}
