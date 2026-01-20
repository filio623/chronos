import prisma from "@/lib/prisma";
import { Project } from "@prisma/client";

export async function getProjects(filters?: {
  clientId?: string;
  status?: 'active' | 'archived';
  search?: string;
}) {
  const where: any = {};

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

  try {
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        timeEntries: true, // Fetch entries to sum duration
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return projects;
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
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
