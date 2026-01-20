import prisma from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export async function getSummaryMetrics(startDate: Date, endDate: Date) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      endTime: {
        not: null,
      },
    },
  });

  const totalSeconds = entries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const billableSeconds = entries
    .filter((e) => e.isBillable)
    .reduce((acc, curr) => acc + (curr.duration || 0), 0);

  return {
    totalSeconds,
    billableSeconds,
    totalAmount: 0, // Future: Multiply by project rate
  };
}

export async function getDailyActivity(startDate: Date, endDate: Date) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      endTime: {
        not: null,
      },
    },
    select: {
      startTime: true,
      duration: true,
    },
  });

  // Group by day
  const dailyMap: Record<string, number> = {};
  
  // Initialize map with all days in range
  let current = new Date(startDate);
  while (current <= endDate) {
    dailyMap[format(current, "yyyy-MM-dd")] = 0;
    current.setDate(current.getDate() + 1);
  }

  entries.forEach((entry) => {
    const day = format(entry.startTime, "yyyy-MM-dd");
    if (dailyMap[day] !== undefined) {
      dailyMap[day] += (entry.duration || 0) / 3600;
    }
  });

  return Object.entries(dailyMap).map(([date, hours]) => ({
    date,
    hours: parseFloat(hours.toFixed(2)),
  }));
}

export async function getProjectDistribution(startDate: Date, endDate: Date) {
  const projects = await prisma.project.findMany({
    include: {
      timeEntries: {
        where: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          endTime: {
            not: null,
          },
        },
      },
    },
  });

  const distribution = projects
    .map((p) => {
      const seconds = p.timeEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      return {
        name: p.name,
        hours: parseFloat((seconds / 3600).toFixed(2)),
        color: p.color,
      };
    })
    .filter((p) => p.hours > 0);

  return distribution;
}
