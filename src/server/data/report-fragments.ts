import { Prisma } from "@prisma/client";

export interface ReportFilter {
  startDate: Date;
  endDate: Date;
  projectId?: string | null;
  clientId?: string | null;
  isBillable?: boolean;
  // CONTRACT: a new filter axis is added here once, and the three filter
  // emitters below all gain support for it together. The cross-form test
  // catches any emitter that drifts.
}

/** clientId only applies when projectId is absent. Encapsulated here so
 *  every caller stops re-deriving it. */
function effectiveClientId(filter: ReportFilter): string | null {
  if (filter.projectId) return null;
  return filter.clientId ?? null;
}

/**
 * WHERE-clause body for raw SQL report queries.
 * mode='single' — for queries that don't JOIN Project. Client filter emits a subquery.
 * mode='joined' — for queries that have JOINed Project (alias `p`). Client filter emits
 *                 `(t."clientId" = ? OR p."clientId" = ?)`.
 *
 * Caller wraps the result in `WHERE ${...}`.
 */
export function entryFilterSql(
  filter: ReportFilter,
  mode: "single" | "joined",
): Prisma.Sql {
  const tableAlias = mode === "joined" ? Prisma.sql`t.` : Prisma.empty;

  const parts: Prisma.Sql[] = [
    Prisma.sql`${tableAlias}"startTime" >= ${filter.startDate}`,
    Prisma.sql`${tableAlias}"startTime" <= ${filter.endDate}`,
    Prisma.sql`${tableAlias}"endTime" IS NOT NULL`,
  ];

  if (filter.projectId) {
    parts.push(Prisma.sql`${tableAlias}"projectId" = ${filter.projectId}`);
  }

  const filterClient = effectiveClientId(filter);
  if (filterClient) {
    if (mode === "joined") {
      parts.push(Prisma.sql`(t."clientId" = ${filterClient} OR p."clientId" = ${filterClient})`);
    } else {
      parts.push(Prisma.sql`("clientId" = ${filterClient} OR "projectId" IN (SELECT id FROM "Project" WHERE "clientId" = ${filterClient}))`);
    }
  }

  if (filter.isBillable !== undefined) {
    parts.push(Prisma.sql`${tableAlias}"isBillable" = ${filter.isBillable}`);
  }

  return Prisma.join(parts, " AND ");
}

/** Same logical filter, structured form. For prisma.timeEntry.aggregate() callers. */
export function entryFilterWhere(filter: ReportFilter): Prisma.TimeEntryWhereInput {
  const where: Prisma.TimeEntryWhereInput = {
    startTime: { gte: filter.startDate, lte: filter.endDate },
    endTime: { not: null },
  };

  if (filter.projectId) {
    where.projectId = filter.projectId;
  } else {
    const filterClient = effectiveClientId(filter);
    if (filterClient) {
      where.OR = [
        { clientId: filterClient },
        { project: { clientId: filterClient } },
      ];
    }
  }

  if (filter.isBillable !== undefined) {
    where.isBillable = filter.isBillable;
  }

  return where;
}

/**
 * Standard report joins. Use when a query needs project/client metadata or rates.
 *   LEFT JOIN "Project" p ON p.id = t."projectId"
 *   LEFT JOIN "Client"  c ON c.id = COALESCE(t."clientId", p."clientId")
 */
export function reportJoinsSql(): Prisma.Sql {
  return Prisma.sql`
    LEFT JOIN "Project" p ON p.id = t."projectId"
    LEFT JOIN "Client"  c ON c.id = COALESCE(t."clientId", p."clientId")
  `;
}

/**
 * Rate-weighted hours expression:
 *   (t.duration / 3600.0) * COALESCE(t."rateOverride", p."hourlyRate", c."defaultRate", 0).
 * Requires reportJoinsSql() in the same query (uses p, c aliases).
 */
export function billableAmountSql(): Prisma.Sql {
  return Prisma.sql`(t.duration / 3600.0) * COALESCE(t."rateOverride", p."hourlyRate", c."defaultRate", 0)`;
}

/** Hours conversion: COALESCE(SUM(t.duration), 0) / 3600.0. */
export function hoursSumSql(): Prisma.Sql {
  return Prisma.sql`COALESCE(SUM(t.duration), 0) / 3600.0`;
}
