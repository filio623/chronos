import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";

export type ReportFilters = {
  projectId?: string;
  clientId?: string;
  groupBy?: 'project' | 'client' | 'day';
};

async function buildEntryWhere(startDate: Date, endDate: Date, filters?: ReportFilters) {
  const where: Prisma.TimeEntryWhereInput = {
    startTime: { gte: startDate, lte: endDate },
    endTime: { not: null },
  };

  if (filters?.projectId) {
    where.projectId = filters.projectId;
    return where;
  }

  if (filters?.clientId) {
    const projectIds = await prisma.project.findMany({
      where: { clientId: filters.clientId },
      select: { id: true },
    });

    const ids = projectIds.map(p => p.id);
    where.OR = [
      { clientId: filters.clientId },
      ...(ids.length > 0 ? [{ projectId: { in: ids } }] : []),
    ];
  }

  return where;
}

export async function getSummaryMetrics(startDate: Date, endDate: Date, filters?: ReportFilters) {
  const where = await buildEntryWhere(startDate, endDate, filters);
  // Use Prisma aggregate instead of fetching all records
  const [totalAgg, billableAgg] = await Promise.all([
    prisma.timeEntry.aggregate({
      where,
      _sum: { duration: true },
    }),
    prisma.timeEntry.aggregate({
      where: {
        ...where,
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

export async function getDailyActivity(startDate: Date, endDate: Date, filters?: ReportFilters) {
  const filterProject = filters?.projectId;
  const filterClient = filters?.clientId && !filters?.projectId ? filters.clientId : null;

  // Use Prisma groupBy for daily aggregation
  const dailyEntries = await prisma.$queryRaw<{ day: string; total_seconds: bigint }[]>(
    Prisma.sql`
      SELECT
        TO_CHAR("startTime", 'YYYY-MM-DD') as day,
        COALESCE(SUM(duration), 0) as total_seconds
      FROM "TimeEntry"
      WHERE "startTime" >= ${startDate}
        AND "startTime" <= ${endDate}
        AND "endTime" IS NOT NULL
        ${filterProject ? Prisma.sql`AND "projectId" = ${filterProject}` : Prisma.empty}
        ${filterClient ? Prisma.sql`AND ("clientId" = ${filterClient} OR "projectId" IN (SELECT id FROM "Project" WHERE "clientId" = ${filterClient}))` : Prisma.empty}
      GROUP BY TO_CHAR("startTime", 'YYYY-MM-DD')
      ORDER BY day
    `
  );

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

export async function getProjectDistribution(startDate: Date, endDate: Date, filters?: ReportFilters) {
  if (filters?.groupBy === 'client') {
    const where = await buildEntryWhere(startDate, endDate, { ...filters, projectId: undefined });
    const clientHours = await prisma.timeEntry.groupBy({
      by: ['clientId'],
      where: {
        ...where,
        clientId: { not: null },
      },
      _sum: { duration: true },
    });

    const clientIds = clientHours.map(c => c.clientId).filter(Boolean) as string[];
    if (clientIds.length === 0) return [];

    const clientDetails = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true, color: true },
    });

    const clientMap = new Map(clientDetails.map(c => [c.id, c]));

    return clientHours
      .map((c) => {
        const client = c.clientId ? clientMap.get(c.clientId) : null;
        if (!client) return null;
        return {
          name: client.name,
          hours: parseFloat(((c._sum.duration || 0) / 3600).toFixed(2)),
          color: client.color,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }

  if (filters?.groupBy === 'day') {
    const daily = await getDailyActivity(startDate, endDate, filters);
    return daily.map(d => ({
      name: d.date,
      hours: d.hours,
      color: 'text-slate-600',
    }));
  }

  const where = await buildEntryWhere(startDate, endDate, filters);
  // Use Prisma groupBy with aggregation
  const projectHours = await prisma.timeEntry.groupBy({
    by: ['projectId'],
    where: {
      ...where,
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
