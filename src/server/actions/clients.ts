"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDefaultWorkspaceId } from "@/lib/workspaces";

export async function createClient(formData: FormData) {
  const name = formData.get("name") as string;
  const currency = (formData.get("currency") as string) || "USD";
  
  if (!name) throw new Error("Client name is required");

  const workspaceId = await getDefaultWorkspaceId();

  try {
    await prisma.client.create({
      data: {
        name,
        currency,
        workspaceId,
      },
    });

    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false, error: "Failed to create client" };
  }
}
