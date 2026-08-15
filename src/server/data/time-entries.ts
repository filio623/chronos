import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { UNASSIGNED_PROJECT_KEY, rangesOverlap } from "@/lib/tracking";

export type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{
  include: {
    tags: true;
    project: { include: { client: true } };
  };
}>;

const timeEntryInclude = {
  tags: true,
  project: {
    include: {
      client: true,
    },
  },
} as const;

export type TimeEntryListOptions = {
  startTimeGte?: Date;
  startTimeLt?: Date;
  page?: number;
  pageSize?: number;
  q?: string;
  projectId?: string;
  clientId?: string;
  isBillable?: boolean;
};

export function buildTimeEntryListArgs(options: TimeEntryListOptions = {}): {
  where: Prisma.TimeEntryWhereInput;
  orderBy: Prisma.TimeEntryOrderByWithRelationInput;
  skip?: number;
  take?: number;
} {
  const where: Prisma.TimeEntryWhereInput = {};
  if (options.startTimeGte || options.startTimeLt) {
    where.startTime = {
      ...(options.startTimeGte ? { gte: options.startTimeGte } : {}),
      ...(options.startTimeLt ? { lt: options.startTimeLt } : {}),
    };
  }
  if (options.q) {
    where.description = { contains: options.q, mode: "insensitive" };
  }
  if (options.projectId === UNASSIGNED_PROJECT_KEY) {
    where.projectId = null;
  } else if (options.projectId) {
    where.projectId = options.projectId;
  }
  if (options.clientId) {
    where.clientId = options.clientId;
  }
  if (options.isBillable !== undefined) {
    where.isBillable = options.isBillable;
  }

  const page = options.page ?? 1;
  const pageSize = options.pageSize;

  return {
    where,
    orderBy: { startTime: "desc" },
    ...(pageSize != null ? { skip: (Math.max(1, page) - 1) * pageSize, take: pageSize } : {}),
  };
}

export async function getTimeEntries(options: TimeEntryListOptions = {}): Promise<{
  entries: TimeEntryWithRelations[];
  totalCount: number;
}> {
  const args = buildTimeEntryListArgs(options);
  const [entries, totalCount] = await Promise.all([
    prisma.timeEntry.findMany({
      ...args,
      include: timeEntryInclude,
    }),
    prisma.timeEntry.count({ where: args.where }),
  ]);
  return { entries, totalCount };
}

export async function getActiveTimer(): Promise<TimeEntryWithRelations | null> {
  return prisma.timeEntry.findFirst({
    where: { endTime: null },
    include: timeEntryInclude,
  });
}

export async function findOverlappingEntryIds(
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<string[]> {
  const candidates = await prisma.timeEntry.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startTime: { lt: end },
      OR: [{ endTime: { gt: start } }, { endTime: null }],
    },
    select: { id: true, startTime: true, endTime: true },
  });
  const now = new Date();
  return candidates
    .filter((entry) => rangesOverlap(start, end, entry.startTime, entry.endTime ?? now))
    .map((entry) => entry.id);
}
