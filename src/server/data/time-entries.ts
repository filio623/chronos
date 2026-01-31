import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{
  include: {
    tags: true;
    project: { include: { client: true } };
  };
}>;

export async function getTimeEntries(limit = 50): Promise<TimeEntryWithRelations[]> {
  try {
    const entries = await prisma.timeEntry.findMany({
      take: limit,
      orderBy: {
        startTime: 'desc',
      },
      include: {
        tags: true,
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
