"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDefaultWorkspaceId } from "@/lib/workspaces";
import { BudgetType, ProjectAccess, BudgetReset } from "@prisma/client";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const clientId = formData.get("clientId") as string;
  const budgetLimit = parseFloat(formData.get("budgetLimit") as string) || 0;
  
  if (!name) throw new Error("Project name is required");

  const workspaceId = await getDefaultWorkspaceId();

  try {
    await prisma.project.create({
      data: {
        name,
        clientId: clientId || null,
        budgetLimit,
        budgetType: BudgetType.HOURS,
        budgetReset: BudgetReset.NEVER,
        access: ProjectAccess.PUBLIC,
        workspaceId,
      },
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function deleteProject(id: string) {
  try {
    await prisma.project.delete({
      where: { id }
    });
    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}
