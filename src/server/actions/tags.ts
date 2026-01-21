"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDefaultWorkspaceId } from "@/lib/workspaces";
import { z } from "zod";

// Validation Schemas
const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name must be 50 characters or less"),
  color: z.string().optional().nullable(),
});

const updateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name must be 50 characters or less").optional(),
  color: z.string().optional().nullable(),
});

const idSchema = z.string().uuid("Invalid ID format");

// Default system tags
const SYSTEM_TAGS = [
  { name: "Priority", color: "text-rose-600", isSystem: true },
  { name: "In Progress", color: "text-amber-600", isSystem: true },
  { name: "Completed", color: "text-emerald-600", isSystem: true },
  { name: "Review", color: "text-purple-600", isSystem: true },
];

/**
 * Seed system tags for a workspace
 */
export async function seedSystemTags() {
  const workspaceId = await getDefaultWorkspaceId();

  try {
    // Check if system tags already exist
    const existingTags = await prisma.tag.findMany({
      where: {
        workspaceId,
        isSystem: true,
      },
    });

    if (existingTags.length > 0) {
      return { success: true, message: "System tags already exist" };
    }

    // Create system tags
    await prisma.tag.createMany({
      data: SYSTEM_TAGS.map(tag => ({
        ...tag,
        workspaceId,
      })),
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to seed system tags:", error);
    return { success: false, error: "Failed to seed system tags" };
  }
}

/**
 * Create a new tag
 */
export async function createTag(formData: FormData) {
  const rawData = {
    name: formData.get("name") as string,
    color: (formData.get("color") as string) || null,
  };

  const parsed = createTagSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, color } = parsed.data;
  const workspaceId = await getDefaultWorkspaceId();

  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        isSystem: false,
        workspaceId,
      },
    });

    revalidatePath("/");
    return { success: true, data: tag };
  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === 'P2002') {
      return { success: false, error: "A tag with this name already exists" };
    }
    console.error("Failed to create tag:", error);
    return { success: false, error: "Failed to create tag" };
  }
}

/**
 * Update an existing tag
 */
export async function updateTag(id: string, formData: FormData) {
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid tag ID" };
  }

  const rawData = {
    name: formData.get("name") as string || undefined,
    color: formData.get("color") as string || undefined,
  };

  const parsed = updateTagSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    await prisma.tag.update({
      where: { id: idParsed.data },
      data: parsed.data,
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: "A tag with this name already exists" };
    }
    console.error("Failed to update tag:", error);
    return { success: false, error: "Failed to update tag" };
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid tag ID" };
  }

  try {
    // Check if it's a system tag
    const tag = await prisma.tag.findUnique({
      where: { id: parsed.data },
    });

    if (tag?.isSystem) {
      return { success: false, error: "Cannot delete system tags" };
    }

    await prisma.tag.delete({
      where: { id: parsed.data },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

/**
 * Assign tags to a project
 */
export async function assignTagsToProject(projectId: string, tagIds: string[]) {
  const projectParsed = idSchema.safeParse(projectId);
  if (!projectParsed.success) {
    return { success: false, error: "Invalid project ID" };
  }

  try {
    await prisma.project.update({
      where: { id: projectParsed.data },
      data: {
        tags: {
          set: tagIds.map(id => ({ id })),
        },
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign tags to project:", error);
    return { success: false, error: "Failed to assign tags" };
  }
}

/**
 * Assign tags to a time entry
 */
export async function assignTagsToEntry(entryId: string, tagIds: string[]) {
  const entryParsed = idSchema.safeParse(entryId);
  if (!entryParsed.success) {
    return { success: false, error: "Invalid entry ID" };
  }

  try {
    await prisma.timeEntry.update({
      where: { id: entryParsed.data },
      data: {
        tags: {
          set: tagIds.map(id => ({ id })),
        },
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign tags to entry:", error);
    return { success: false, error: "Failed to assign tags" };
  }
}
