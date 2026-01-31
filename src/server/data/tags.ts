import prisma from "@/lib/prisma";
import { Tag } from "@prisma/client";
import { getDefaultWorkspaceId } from "@/lib/workspaces";

const SYSTEM_TAGS = [
  { name: "Priority", color: "text-rose-600", isSystem: true },
  { name: "In Progress", color: "text-amber-600", isSystem: true },
  { name: "Completed", color: "text-emerald-600", isSystem: true },
  { name: "Review", color: "text-purple-600", isSystem: true },
];

async function ensureSystemTags() {
  const workspaceId = await getDefaultWorkspaceId();
  const existing = await prisma.tag.findMany({
    where: { workspaceId, isSystem: true },
    select: { id: true },
  });
  if (existing.length > 0) return;

  await prisma.tag.createMany({
    data: SYSTEM_TAGS.map(tag => ({ ...tag, workspaceId })),
  });
}

export async function getTags(): Promise<Tag[]> {
  try {
    await ensureSystemTags();
    const tags = await prisma.tag.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });
    return tags;
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return [];
  }
}

export async function getTagById(id: string): Promise<Tag | null> {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id },
    });
    return tag;
  } catch (error) {
    console.error(`Failed to fetch tag ${id}:`, error);
    return null;
  }
}

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  try {
    const tags = await prisma.tag.findMany({
      where: { id: { in: ids } },
    });
    return tags;
  } catch (error) {
    console.error("Failed to fetch tags by IDs:", error);
    return [];
  }
}

export async function getProjectTags(projectId: string): Promise<Tag[]> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tags: true },
    });
    return project?.tags || [];
  } catch (error) {
    console.error(`Failed to fetch tags for project ${projectId}:`, error);
    return [];
  }
}

export async function getEntryTags(entryId: string): Promise<Tag[]> {
  try {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: { tags: true },
    });
    return entry?.tags || [];
  } catch (error) {
    console.error(`Failed to fetch tags for entry ${entryId}:`, error);
    return [];
  }
}
