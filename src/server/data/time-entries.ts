import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
