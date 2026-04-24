import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  type ReportFilter,
  entryFilterSql,
  entryFilterWhere,
  reportJoinsSql,
  billableAmountSql,
  hoursSumSql,
} from "./report-fragments";

export type ReportFilters = {
  projectId?: string;
  clientId?: string;
  groupBy?: 'project' | 'client' | 'day';
};

function toNumber(value: number | bigint | Prisma.Decimal): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value);
}

function toFilter(startDate: Date, endDate: Date, filters?: ReportFilters, isBillable?: boolean): ReportFilter {
  return {
    startDate,
    endDate,
    projectId: filters?.projectId ?? null,
    clientId: filters?.clientId ?? null,
    isBillable,
  };
}

export async function getSummaryMetrics(startDate: Date, endDate: Date, filters?: ReportFilters) {
  const baseFilter = toFilter(startDate, endDate, filters);
  const where = entryFilterWhere(baseFilter);

  const [totalAgg, billableAgg] = await Promise.all([
    prisma.timeEntry.aggregate({
      where,
      _sum: { duration: true },
    }),
    prisma.timeEntry.aggregate({
      where: { ...where, isBillable: true },
      _sum: { duration: true },
    }),
  ]);

  const billableFilter = toFilter(startDate, endDate, filters, true);
  const amountRows = await prisma.$queryRaw<{ total_amount: number | Prisma.Decimal }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(${billableAmountSql()}), 0) AS total_amount
      FROM "TimeEntry" t
      ${reportJoinsSql()}
      WHERE ${entryFilterSql(billableFilter, "joined")}
    `
  );

  const totalAmount = toNumber(amountRows[0]?.total_amount ?? 0);

  return {
    totalSeconds: totalAgg._sum.duration || 0,
    billableSeconds: billableAgg._sum.duration || 0,
    totalAmount,
  };
}

export async function getDailyActivity(startDate: Date, endDate: Date, filters?: ReportFilters) {
  const filter = toFilter(startDate, endDate, filters);

  const dailyEntries = await prisma.$queryRaw<{ day: string; total_seconds: bigint }[]>(
    Prisma.sql`
      SELECT
        TO_CHAR("startTime", 'YYYY-MM-DD') as day,
        COALESCE(SUM(duration), 0) as total_seconds
      FROM "TimeEntry"
      WHERE ${entryFilterSql(filter, "single")}
      GROUP BY TO_CHAR("startTime", 'YYYY-MM-DD')
      ORDER BY day
    `
  );

  const dbMap = new Map<string, number>();
  dailyEntries.forEach((entry) => {
    dbMap.set(entry.day, Number(entry.total_seconds));
  });

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

export async function getDailyActivityGrouped(startDate: Date, endDate: Date, filters?: ReportFilters) {
  const filter = toFilter(startDate, endDate, filters);
  const groupBy = filters?.groupBy === 'client' ? 'client' : 'project';

  if (groupBy === 'client') {
    const rows = await prisma.$queryRaw<{ day: string; name: string; color: string; hours: number | Prisma.Decimal }[]>(
      Prisma.sql`
        SELECT
          TO_CHAR(t."startTime", 'YYYY-MM-DD') as day,
          c.name as name,
          c.color as color,
          ${hoursSumSql()} as hours
        FROM "TimeEntry" t
        ${reportJoinsSql()}
        WHERE ${entryFilterSql(filter, "joined")} AND c.id IS NOT NULL
        GROUP BY day, c.id, c.name, c.color
        ORDER BY day
      `
    );
    return rows.map((row) => ({
      ...row,
      hours: toNumber(row.hours),
    }));
  }

  const rows = await prisma.$queryRaw<{ day: string; name: string; color: string; hours: number | Prisma.Decimal; client_name: string | null }[]>(
    Prisma.sql`
      SELECT
        TO_CHAR(t."startTime", 'YYYY-MM-DD') as day,
        p.name as name,
        p.color as color,
        c.name as client_name,
        ${hoursSumSql()} as hours
      FROM "TimeEntry" t
      ${reportJoinsSql()}
      WHERE ${entryFilterSql(filter, "joined")} AND p.id IS NOT NULL
      GROUP BY day, p.id, p.name, p.color, c.name
      ORDER BY day
    `
  );
  return rows.map((row) => ({
    ...row,
    hours: toNumber(row.hours),
  }));
}

export async function getProjectDistribution(startDate: Date, endDate: Date, filters?: ReportFilters) {
  if (filters?.groupBy === 'client') {
    const filter = toFilter(startDate, endDate, filters);

    const clientHours = await prisma.$queryRaw<{ client_id: string; name: string; color: string; hours: number | Prisma.Decimal; amount: number | Prisma.Decimal }[]>(
      Prisma.sql`
        SELECT
          c.id as client_id,
          c.name as name,
          c.color as color,
          ${hoursSumSql()} as hours,
          COALESCE(SUM(${billableAmountSql()}), 0) as amount
        FROM "TimeEntry" t
        ${reportJoinsSql()}
        WHERE ${entryFilterSql(filter, "joined")} AND c.id IS NOT NULL
        GROUP BY c.id, c.name, c.color
        ORDER BY hours DESC
      `
    );

    return clientHours.map(c => ({
      name: c.name,
      hours: parseFloat(toNumber(c.hours).toFixed(2)),
      color: c.color,
      amount: parseFloat(toNumber(c.amount).toFixed(2)),
    }));
  }

  if (filters?.groupBy === 'day') {
    const daily = await getDailyActivity(startDate, endDate, filters);
    return daily.map(d => ({
      name: d.date,
      hours: d.hours,
      color: 'text-slate-600',
    }));
  }

  const filter = toFilter(startDate, endDate, filters);

  const projectDistribution = await prisma.$queryRaw<{
    project_id: string;
    name: string;
    color: string;
    client_name: string | null;
    hours: number | Prisma.Decimal;
    amount: number | Prisma.Decimal;
  }[]>(
    Prisma.sql`
      SELECT
        p.id as project_id,
        p.name as name,
        p.color as color,
        c.name as client_name,
        ${hoursSumSql()} as hours,
        COALESCE(SUM(${billableAmountSql()}), 0) as amount
      FROM "TimeEntry" t
      JOIN "Project" p ON p.id = t."projectId"
      LEFT JOIN "Client" c ON c.id = COALESCE(t."clientId", p."clientId")
      WHERE ${entryFilterSql(filter, "joined")}
      GROUP BY p.id, p.name, p.color, c.name
      HAVING COALESCE(SUM(t.duration), 0) > 0
      ORDER BY hours DESC
    `
  );

  return projectDistribution.map(p => ({
    name: p.name,
    hours: parseFloat(toNumber(p.hours).toFixed(2)),
    color: p.color,
    clientName: p.client_name ?? null,
    amount: parseFloat(toNumber(p.amount).toFixed(2)),
  }));
}
