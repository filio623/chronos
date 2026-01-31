"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDefaultWorkspaceId } from "@/lib/workspaces";
import { BudgetType, ProjectAccess, BudgetReset } from "@prisma/client";
import { z } from "zod";
import { COLOR_PALETTE } from "@/lib/colors";

// Color palette for auto-assigning project colors
async function getNextProjectColor(): Promise<string> {
  const projects = await prisma.project.findMany({
    select: { color: true },
    orderBy: { createdAt: 'desc' },
    take: COLOR_PALETTE.length,
  });

  const usedColors = projects.map(p => p.color);

  // Find first unused color
  for (const color of COLOR_PALETTE) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }

  // If all used, cycle back
  const projectCount = await prisma.project.count();
  return COLOR_PALETTE[projectCount % COLOR_PALETTE.length];
}

// Validation Schemas
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name must be 100 characters or less"),
  clientId: z.string().uuid().optional().nullable(),
  budgetLimit: z.number().min(0, "Budget limit must be 0 or greater").default(0),
  color: z.string().optional(),
  defaultBillable: z.boolean().nullable().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name must be 100 characters or less"),
  clientId: z.string().uuid().optional().nullable(),
  budgetLimit: z.number().min(0, "Budget limit must be 0 or greater").default(0),
  color: z.string().optional(),
  defaultBillable: z.boolean().nullable().optional(),
});

const idSchema = z.string().uuid("Invalid ID format");

export async function createProject(formData: FormData) {
  const rawDefault = formData.get("defaultBillable") as string | null;
  const rawData = {
    name: formData.get("name") as string,
    clientId: (formData.get("clientId") as string) || null,
    budgetLimit: parseFloat(formData.get("budgetLimit") as string) || 0,
    color: (formData.get("color") as string) || undefined,
    defaultBillable: rawDefault
      ? rawDefault === "billable"
        ? true
        : rawDefault === "non-billable"
          ? false
          : null
      : null,
  };

  const parsed = createProjectSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, clientId, budgetLimit, color, defaultBillable } = parsed.data;
  const workspaceId = await getDefaultWorkspaceId();
  const projectColor = color || await getNextProjectColor();

  try {
    const project = await prisma.project.create({
      data: {
        name,
        clientId: clientId || null,
        budgetLimit,
        color: projectColor,
        budgetType: BudgetType.HOURS,
        budgetReset: BudgetReset.NEVER,
        access: ProjectAccess.PUBLIC,
        workspaceId,
        defaultBillable,
      },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true, data: project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function deleteProject(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid project ID" };
  }

  try {
    await prisma.project.delete({
      where: { id: parsed.data }
    });
    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}

export async function updateProject(id: string, formData: FormData) {
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid project ID" };
  }

  const rawClientId = formData.get("clientId") as string;
  const rawDefault = formData.get("defaultBillable") as string | null;
  const rawData = {
    name: formData.get("name") as string,
    clientId: rawClientId === 'none' ? null : rawClientId || null,
    budgetLimit: parseFloat(formData.get("budgetLimit") as string) || 0,
    color: (formData.get("color") as string) || undefined,
    defaultBillable: rawDefault
      ? rawDefault === "billable"
        ? true
        : rawDefault === "non-billable"
          ? false
          : null
      : undefined,
  };

  const parsed = updateProjectSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, clientId, budgetLimit, color, defaultBillable } = parsed.data;

  try {
    await prisma.project.update({
      where: { id: idParsed.data },
      data: {
        name,
        clientId,
        budgetLimit,
        ...(color && { color }),
        ...(defaultBillable !== undefined && { defaultBillable }),
      },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

export async function toggleFavorite(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid project ID" };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: parsed.data },
      select: { isFavorite: true }
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    await prisma.project.update({
      where: { id: parsed.data },
      data: { isFavorite: !project.isFavorite },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
}

export async function archiveProject(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid project ID" };
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data },
      data: { isArchived: true },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to archive project:", error);
    return { success: false, error: "Failed to archive project" };
  }
}

export async function unarchiveProject(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid project ID" };
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data },
      data: { isArchived: false },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to unarchive project:", error);
    return { success: false, error: "Failed to unarchive project" };
  }
}
