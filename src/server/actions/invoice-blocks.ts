"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { InvoiceBlockStatus } from "@prisma/client";
import { z } from "zod";
import { calculateBlockHours } from "@/server/data/invoice-blocks";

const createBlockSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  hoursTarget: z.number().min(0.5, "Hours target must be at least 0.5").max(10000, "Hours target too large"),
  notes: z.string().max(500, "Notes too long").optional(),
});

const updateBlockSchema = z.object({
  hoursTarget: z.number().min(0.5, "Hours target must be at least 0.5").max(10000, "Hours target too large").optional(),
  notes: z.string().max(500, "Notes too long").optional().nullable(),
});

const idSchema = z.string().uuid("Invalid ID format");

/**
 * Create a new invoice block for a client
 * First completes any existing active block
 */
export async function createInvoiceBlock(
  clientId: string,
  hoursTarget: number,
  notes?: string
) {
  const parsed = createBlockSchema.safeParse({ clientId, hoursTarget, notes });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    // Check for existing active block
    const existingBlock = await prisma.invoiceBlock.findFirst({
      where: {
        clientId: parsed.data.clientId,
        status: InvoiceBlockStatus.ACTIVE,
      },
    });

    if (existingBlock) {
      return {
        success: false,
        error: "Client already has an active invoice block. Please reset it first.",
      };
    }

    // Create new block
    const block = await prisma.invoiceBlock.create({
      data: {
        clientId: parsed.data.clientId,
        hoursTarget: parsed.data.hoursTarget,
        notes: parsed.data.notes,
        status: InvoiceBlockStatus.ACTIVE,
      },
    });

    revalidatePath("/");
    revalidatePath("/clients");
    return { success: true, data: block };
  } catch (error) {
    console.error("Failed to create invoice block:", error);
    return { success: false, error: "Failed to create invoice block" };
  }
}

/**
 * Reset/complete an invoice block
 * Optionally carry overage hours to a new block
 */
export async function resetInvoiceBlock(
  blockId: string,
  carryOverage: boolean = false,
  newTargetHours?: number
) {
  const parsed = idSchema.safeParse(blockId);
  if (!parsed.success) {
    return { success: false, error: "Invalid block ID" };
  }

  try {
    const block = await prisma.invoiceBlock.findUnique({
      where: { id: parsed.data },
    });

    if (!block) {
      return { success: false, error: "Invoice block not found" };
    }

    if (block.status !== InvoiceBlockStatus.ACTIVE) {
      return { success: false, error: "Invoice block is not active" };
    }

    // Calculate hours tracked for this block
    const hoursTracked = await calculateBlockHours(
      block.clientId,
      block.startDate,
      null
    );

    const totalAvailable = block.hoursTarget + block.hoursCarriedForward;
    const overage = Math.max(0, hoursTracked - totalAvailable);

    // Complete the current block
    await prisma.invoiceBlock.update({
      where: { id: parsed.data },
      data: {
        status: InvoiceBlockStatus.COMPLETED,
        endDate: new Date(),
      },
    });

    // Create new block if requested
    if (newTargetHours && newTargetHours > 0) {
      await prisma.invoiceBlock.create({
        data: {
          clientId: block.clientId,
          hoursTarget: newTargetHours,
          hoursCarriedForward: carryOverage ? overage : 0,
          status: InvoiceBlockStatus.ACTIVE,
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/clients");
    return { success: true, overage };
  } catch (error) {
    console.error("Failed to reset invoice block:", error);
    return { success: false, error: "Failed to reset invoice block" };
  }
}

/**
 * Update an invoice block (target hours or notes)
 */
export async function updateInvoiceBlock(
  blockId: string,
  data: { hoursTarget?: number; notes?: string | null }
) {
  const idParsed = idSchema.safeParse(blockId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid block ID" };
  }

  const dataParsed = updateBlockSchema.safeParse(data);
  if (!dataParsed.success) {
    return { success: false, error: dataParsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const block = await prisma.invoiceBlock.findUnique({
      where: { id: idParsed.data },
    });

    if (!block) {
      return { success: false, error: "Invoice block not found" };
    }

    const updateData: { hoursTarget?: number; notes?: string | null } = {};
    if (dataParsed.data.hoursTarget !== undefined) {
      updateData.hoursTarget = dataParsed.data.hoursTarget;
    }
    if (dataParsed.data.notes !== undefined) {
      updateData.notes = dataParsed.data.notes;
    }

    await prisma.invoiceBlock.update({
      where: { id: idParsed.data },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("Failed to update invoice block:", error);
    return { success: false, error: "Failed to update invoice block" };
  }
}

/**
 * Delete an invoice block
 */
export async function deleteInvoiceBlock(blockId: string) {
  const parsed = idSchema.safeParse(blockId);
  if (!parsed.success) {
    return { success: false, error: "Invalid block ID" };
  }

  try {
    await prisma.invoiceBlock.delete({
      where: { id: parsed.data },
    });

    revalidatePath("/");
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete invoice block:", error);
    return { success: false, error: "Failed to delete invoice block" };
  }
}
