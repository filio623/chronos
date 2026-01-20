"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDefaultWorkspaceId } from "@/lib/workspaces";
import { z } from "zod";

// Validation Schemas
const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100, "Client name must be 100 characters or less"),
  currency: z.string().length(3, "Currency must be a 3-letter code").default("USD"),
});

export async function createClient(formData: FormData) {
  const rawData = {
    name: formData.get("name") as string,
    currency: (formData.get("currency") as string) || "USD",
  };

  const parsed = createClientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, currency } = parsed.data;
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
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false, error: "Failed to create client" };
  }
}
