"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDefaultWorkspaceId } from "@/lib/workspaces";
import { z } from "zod";

// Color palette for auto-assigning client colors
const COLOR_PALETTE = [
  'text-indigo-600', 'text-purple-600', 'text-blue-600',
  'text-emerald-600', 'text-rose-600', 'text-amber-600',
  'text-cyan-600', 'text-pink-600', 'text-teal-600'
];

// Validation Schemas
const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100, "Client name must be 100 characters or less"),
  currency: z.string().length(3, "Currency must be a 3-letter code").default("USD"),
});

const updateClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100, "Client name must be 100 characters or less").optional(),
  address: z.string().max(500, "Address too long").optional().nullable(),
  currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
  color: z.string().optional(),
  budgetLimit: z.number().min(0, "Budget limit must be 0 or greater").optional(),
});

const idSchema = z.string().uuid("Invalid ID format");

async function getNextClientColor(): Promise<string> {
  const clients = await prisma.client.findMany({
    select: { color: true },
    orderBy: { createdAt: 'desc' },
    take: COLOR_PALETTE.length,
  });

  const usedColors = clients.map(c => c.color);

  // Find first unused color
  for (const color of COLOR_PALETTE) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }

  // If all used, cycle back
  const clientCount = await prisma.client.count();
  return COLOR_PALETTE[clientCount % COLOR_PALETTE.length];
}

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
  const color = await getNextClientColor();

  try {
    const client = await prisma.client.create({
      data: {
        name,
        currency,
        color,
        workspaceId,
      },
    });

    revalidatePath("/clients");
    revalidatePath("/");
    return { success: true, data: client };
  } catch (error) {
    console.error("Failed to create client:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(id: string, formData: FormData) {
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid client ID" };
  }

  const rawBudgetLimit = formData.get("budgetLimit");
  const rawData = {
    name: formData.get("name") as string || undefined,
    address: formData.get("address") as string || undefined,
    currency: formData.get("currency") as string || undefined,
    color: formData.get("color") as string || undefined,
    budgetLimit: rawBudgetLimit ? parseFloat(rawBudgetLimit as string) : undefined,
  };

  const parsed = updateClientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    await prisma.client.update({
      where: { id: idParsed.data },
      data: parsed.data,
    });

    revalidatePath("/clients");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update client:", error);
    return { success: false, error: "Failed to update client" };
  }
}

export async function deleteClient(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid client ID" };
  }

  try {
    await prisma.client.delete({
      where: { id: parsed.data },
    });

    revalidatePath("/clients");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    return { success: false, error: "Failed to delete client" };
  }
}
