import prisma from "@/lib/prisma";
import { Project, Prisma } from "@prisma/client";

// Type for project with computed hours
export type ProjectWithHours = Project & {
  client: { id: string; name: string } | null;
  hoursUsed: number;
};

export async function getProjects(filters?: {
  clientId?: string;
  status?: 'active' | 'archived';
  search?: string;
  sortBy?: 'name' | 'client' | 'hoursUsed' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{ projects: ProjectWithHours[]; totalCount: number }> {
  const where: Prisma.ProjectWhereInput = {};

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.status === 'archived') {
    where.isArchived = true;
  } else if (filters?.status === 'active') {
    where.isArchived = false;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { client: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  // Default sorting
  const sortBy = filters?.sortBy || 'updatedAt';
  const sortOrder = filters?.sortOrder || 'desc';

  // Build orderBy - handle client sorting specially
  let orderBy: Prisma.ProjectOrderByWithRelationInput = {};
  if (sortBy === 'client') {
    orderBy = { client: { name: sortOrder } };
  } else if (sortBy === 'hoursUsed') {
    // We'll sort in memory after aggregation since Prisma doesn't support sorting by aggregation
    orderBy = { updatedAt: 'desc' };
  } else {
    orderBy = { [sortBy]: sortOrder };
  }

  // Pagination
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  try {
    // Get total count for pagination
    const totalCount = await prisma.project.count({ where });

    // Fetch projects with client info
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    });

    // Get hours for all fetched projects in a single query using aggregation
    const projectIds = projects.map(p => p.id);

    const hoursAggregation = await prisma.timeEntry.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        endTime: { not: null },
      },
      _sum: { duration: true },
    });

    // Create a map of projectId -> hours
    const hoursMap = new Map<string, number>();
    hoursAggregation.forEach(agg => {
      if (agg.projectId) {
        const hours = (agg._sum.duration || 0) / 3600;
        hoursMap.set(agg.projectId, parseFloat(hours.toFixed(2)));
      }
    });

    // Combine projects with computed hours
    let projectsWithHours: ProjectWithHours[] = projects.map(p => ({
      ...p,
      hoursUsed: hoursMap.get(p.id) || 0,
    }));

    // Sort by hoursUsed if requested (in-memory since can't sort by aggregation in Prisma)
    if (sortBy === 'hoursUsed') {
      projectsWithHours.sort((a, b) => {
        return sortOrder === 'asc'
          ? a.hoursUsed - b.hoursUsed
          : b.hoursUsed - a.hoursUsed;
      });
    }

    return { projects: projectsWithHours, totalCount };
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return { projects: [], totalCount: 0 };
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });
    return project;
  } catch (error) {
    console.error(`Failed to fetch project ${id}:`, error);
    return null;
  }
}
