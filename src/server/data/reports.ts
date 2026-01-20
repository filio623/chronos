import prisma from "@/lib/prisma";
import { format } from "date-fns";

export async function getSummaryMetrics(startDate: Date, endDate: Date) {
  // Use Prisma aggregate instead of fetching all records
  const [totalAgg, billableAgg] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: {
        startTime: { gte: startDate, lte: endDate },
        endTime: { not: null },
      },
      _sum: { duration: true },
    }),
    prisma.timeEntry.aggregate({
      where: {
        startTime: { gte: startDate, lte: endDate },
        endTime: { not: null },
        isBillable: true,
      },
      _sum: { duration: true },
    }),
  ]);

  return {
    totalSeconds: totalAgg._sum.duration || 0,
    billableSeconds: billableAgg._sum.duration || 0,
    totalAmount: 0, // Future: Multiply by project rate
  };
}

export async function getDailyActivity(startDate: Date, endDate: Date) {
  // Use Prisma groupBy for daily aggregation
  const dailyEntries = await prisma.$queryRaw<{ day: string; total_seconds: bigint }[]>`
    SELECT
      TO_CHAR("startTime", 'YYYY-MM-DD') as day,
      COALESCE(SUM(duration), 0) as total_seconds
    FROM "TimeEntry"
    WHERE "startTime" >= ${startDate}
      AND "startTime" <= ${endDate}
      AND "endTime" IS NOT NULL
    GROUP BY TO_CHAR("startTime", 'YYYY-MM-DD')
    ORDER BY day
  `;

  // Create a map from database results
  const dbMap = new Map<string, number>();
  dailyEntries.forEach((entry) => {
    dbMap.set(entry.day, Number(entry.total_seconds));
  });

  // Initialize map with all days in range
  const result: { date: string; hours: number }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = format(current, "yyyy-MM-dd");
    const seconds = dbMap.get(dateKey) || 0;
    result.push({
      date: dateKey,
      hours: parseFloat((seconds / 3600).toFixed(2)),
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export async function getProjectDistribution(startDate: Date, endDate: Date) {
  // Use Prisma groupBy with aggregation
  const projectHours = await prisma.timeEntry.groupBy({
    by: ['projectId'],
    where: {
      startTime: { gte: startDate, lte: endDate },
      endTime: { not: null },
      projectId: { not: null },
    },
    _sum: { duration: true },
  });

  // Filter to only projects with hours and fetch project details
  const projectsWithHours = projectHours.filter(p => (p._sum.duration || 0) > 0);

  if (projectsWithHours.length === 0) {
    return [];
  }

  // Fetch project names and colors for those with hours
  const projectDetails = await prisma.project.findMany({
    where: {
      id: { in: projectsWithHours.map(p => p.projectId!).filter(Boolean) },
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  const projectMap = new Map(projectDetails.map(p => [p.id, p]));

  return projectsWithHours
    .map((p) => {
      const project = projectMap.get(p.projectId!);
      if (!project) return null;
      return {
        name: project.name,
        hours: parseFloat(((p._sum.duration || 0) / 3600).toFixed(2)),
        color: project.color,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}
