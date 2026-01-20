import prisma from "@/lib/prisma";
import { Project } from "@prisma/client";

export async function getProjects(): Promise<Project[]> {
  try {
    const projects = await prisma.project.findMany({
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
