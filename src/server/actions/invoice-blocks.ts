"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { InvoiceBlockStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { calculateBlockHours } from "@/server/data/invoice-blocks";

const createBlockSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  hoursTarget: z.number().min(0.5, "Hours target must be at least 0.5").max(10000, "Hours target too large"),
  notes: z.string().max(500, "Notes too long").optional(),
});

const createBlockFromWorkSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  entryIds: z.array(z.string().uuid("Invalid entry ID")).max(1000).default([]),
  projectIds: z.array(z.string().uuid("Invalid project ID")).max(200).default([]),
  hoursTarget: z.number().min(0.5, "Hours target must be at least 0.5").max(10000, "Hours target too large").optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

const updateBlockSchema = z.object({
  hoursTarget: z.number().min(0.5, "Hours target must be at least 0.5").max(10000, "Hours target too large").optional(),
  notes: z.string().max(500, "Notes too long").optional().nullable(),
});

const assignWorkSchema = z.object({
  blockId: z.string().uuid("Invalid block ID"),
  entryIds: z.array(z.string().uuid("Invalid entry ID")).max(1000).default([]),
  projectIds: z.array(z.string().uuid("Invalid project ID")).max(200).default([]),
});

const getWorkOptionsSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  blockId: z.string().uuid("Invalid block ID").optional(),
});

const nonActiveStatusSchema = z.nativeEnum(InvoiceBlockStatus).refine(
  (status) => status !== InvoiceBlockStatus.ACTIVE,
  { message: "Status must be non-active" }
);

const updateStatusSchema = z.object({
  blockId: z.string().uuid("Invalid block ID"),
  status: nonActiveStatusSchema,
});

const idSchema = z.string().uuid("Invalid ID format");
type NonActiveInvoiceBlockStatus = "COMPLETED" | "SUBMITTED" | "PAID";

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function entryBelongsToClient(
  entry: {
    clientId: string | null;
    project: { clientId: string | null } | null;
  },
  clientId: string
): boolean {
  return entry.clientId === clientId || entry.project?.clientId === clientId;
}

function revalidateInvoicePaths() {
  revalidatePath("/");
  revalidatePath("/clients");
}

/**
 * Create a new empty invoice block for a client
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
    const existingBlock = await prisma.invoiceBlock.findFirst({
      where: {
        clientId: parsed.data.clientId,
        status: InvoiceBlockStatus.ACTIVE,
      },
    });

    if (existingBlock) {
      return {
        success: false,
        error: "Client already has an active invoice block. Please complete it first.",
      };
    }

    const block = await prisma.invoiceBlock.create({
      data: {
        clientId: parsed.data.clientId,
        hoursTarget: parsed.data.hoursTarget,
        notes: parsed.data.notes,
        status: InvoiceBlockStatus.ACTIVE,
      },
    });

    revalidateInvoicePaths();
    return { success: true, data: block };
  } catch (error) {
    console.error("Failed to create invoice block:", error);
    return { success: false, error: "Failed to create invoice block" };
  }
}

/**
 * Create a new block from selected work (entries and/or projects)
 */
export async function createInvoiceBlockFromWork(input: {
  clientId: string;
  entryIds?: string[];
  projectIds?: string[];
  hoursTarget?: number;
  notes?: string;
}) {
  const parsed = createBlockFromWorkSchema.safeParse({
    ...input,
    entryIds: dedupeIds(input.entryIds || []),
    projectIds: dedupeIds(input.projectIds || []),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const existingBlock = await prisma.invoiceBlock.findFirst({
      where: {
        clientId: parsed.data.clientId,
        status: InvoiceBlockStatus.ACTIVE,
      },
    });

    if (existingBlock) {
      return {
        success: false,
        error: "Client already has an active invoice block. Add work to it instead.",
      };
    }

    const projects = await prisma.project.findMany({
      where: { clientId: parsed.data.clientId },
      select: { id: true },
    });

    const validProjectIdSet = new Set(projects.map((p) => p.id));
    const validProjectIds = parsed.data.projectIds.filter((id) => validProjectIdSet.has(id));

    const entryFilters: Array<Record<string, unknown>> = [];
    if (parsed.data.entryIds.length > 0) {
      entryFilters.push({ id: { in: parsed.data.entryIds } });
    }
    if (validProjectIds.length > 0) {
      entryFilters.push({ projectId: { in: validProjectIds } });
    }

    if (entryFilters.length === 0) {
      return { success: false, error: "Select at least one entry or project" };
    }

    const candidateEntries = await prisma.timeEntry.findMany({
      where: {
        endTime: { not: null },
        invoiceBlockId: null,
        OR: entryFilters,
      },
      select: {
        id: true,
        duration: true,
        clientId: true,
        projectId: true,
        project: {
          select: {
            clientId: true,
          },
        },
      },
    });

    const eligibleEntries = candidateEntries.filter((entry) => entryBelongsToClient(entry, parsed.data.clientId));
    const eligibleEntryMap = new Map(eligibleEntries.map((entry) => [entry.id, entry]));

    const finalEntryIdSet = new Set<string>();

    for (const entryId of parsed.data.entryIds) {
      if (eligibleEntryMap.has(entryId)) {
        finalEntryIdSet.add(entryId);
      }
    }

    for (const entry of eligibleEntries) {
      if (entry.projectId && validProjectIdSet.has(entry.projectId) && validProjectIds.includes(entry.projectId)) {
        finalEntryIdSet.add(entry.id);
      }
    }

    const finalEntryIds = [...finalEntryIdSet];
    if (finalEntryIds.length === 0 && validProjectIds.length === 0) {
      return { success: false, error: "Select at least one valid entry or project" };
    }

    const totalSeconds = finalEntryIds.reduce((sum, id) => sum + (eligibleEntryMap.get(id)?.duration || 0), 0);
    const selectedHours = parseFloat((totalSeconds / 3600).toFixed(2));

    const targetHours = parsed.data.hoursTarget ?? (selectedHours > 0 ? Math.max(0.5, selectedHours) : 10);

    const block = await prisma.$transaction(async (tx) => {
      const createdBlock = await tx.invoiceBlock.create({
        data: {
          clientId: parsed.data.clientId,
          hoursTarget: targetHours,
          notes: parsed.data.notes,
          status: InvoiceBlockStatus.ACTIVE,
        },
      });

      if (validProjectIds.length > 0) {
        await tx.invoiceBlockProject.createMany({
          data: validProjectIds.map((projectId) => ({
            invoiceBlockId: createdBlock.id,
            projectId,
          })),
          skipDuplicates: true,
        });
      }

      if (finalEntryIds.length > 0) {
        await tx.timeEntry.updateMany({
          where: {
            id: { in: finalEntryIds },
            invoiceBlockId: null,
          },
          data: {
            invoiceBlockId: createdBlock.id,
          },
        });
      }

      return createdBlock;
    });

    revalidateInvoicePaths();
    return {
      success: true,
      data: {
        block,
        selectedHours,
        assignedEntries: finalEntryIds.length,
        linkedProjects: validProjectIds.length,
      },
    };
  } catch (error) {
    console.error("Failed to create invoice block from work:", error);
    return { success: false, error: "Failed to create invoice block from selected work" };
  }
}

/**
 * Return assignable work for a client. If blockId is provided, includes entries already in that block.
 */
export async function getInvoiceBlockWorkOptions(clientId: string, blockId?: string) {
  const parsed = getWorkOptionsSchema.safeParse({ clientId, blockId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const projects = await prisma.project.findMany({
      where: { clientId: parsed.data.clientId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const projectIds = projects.map((project) => project.id);

    const linkedProjectIds = parsed.data.blockId
      ? new Set(
          (
            await prisma.invoiceBlockProject.findMany({
              where: { invoiceBlockId: parsed.data.blockId },
              select: { projectId: true },
            })
          ).map((row) => row.projectId)
        )
      : new Set<string>();

    const andFilters: Prisma.TimeEntryWhereInput[] = [
      {
        OR: [
          { clientId: parsed.data.clientId },
          ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
        ],
      },
    ];

    if (parsed.data.blockId) {
      andFilters.push({
        OR: [{ invoiceBlockId: null }, { invoiceBlockId: parsed.data.blockId }],
      });
    } else {
      andFilters.push({ invoiceBlockId: null });
    }

    const entryWhere: Prisma.TimeEntryWhereInput = {
      endTime: { not: null },
      AND: andFilters,
    };

    const entries = await prisma.timeEntry.findMany({
      where: entryWhere,
      select: {
        id: true,
        description: true,
        startTime: true,
        duration: true,
        projectId: true,
        invoiceBlockId: true,
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 500,
    });

    const mappedEntries = entries.map((entry) => ({
      id: entry.id,
      description: entry.description || "(No description)",
      startTime: entry.startTime.toISOString(),
      durationSeconds: entry.duration || 0,
      durationHours: parseFloat(((entry.duration || 0) / 3600).toFixed(2)),
      projectId: entry.projectId,
      projectName: entry.project?.name || null,
      alreadyInBlock: !!parsed.data.blockId && entry.invoiceBlockId === parsed.data.blockId,
    }));

    const projectStats = new Map<
      string,
      {
        unassignedEntryIds: string[];
        unassignedSeconds: number;
        assignedSecondsInBlock: number;
      }
    >();

    for (const project of projects) {
      projectStats.set(project.id, {
        unassignedEntryIds: [],
        unassignedSeconds: 0,
        assignedSecondsInBlock: 0,
      });
    }

    for (const entry of entries) {
      if (!entry.projectId) continue;
      const stats = projectStats.get(entry.projectId);
      if (!stats) continue;

      const seconds = entry.duration || 0;
      if (entry.invoiceBlockId === null) {
        stats.unassignedEntryIds.push(entry.id);
        stats.unassignedSeconds += seconds;
      } else if (parsed.data.blockId && entry.invoiceBlockId === parsed.data.blockId) {
        stats.assignedSecondsInBlock += seconds;
      }
    }

    const mappedProjects = projects.map((project) => {
      const stats = projectStats.get(project.id)!;
      return {
        id: project.id,
        name: project.name,
        isLinked: linkedProjectIds.has(project.id),
        unassignedEntryIds: stats.unassignedEntryIds,
        unassignedHours: parseFloat((stats.unassignedSeconds / 3600).toFixed(2)),
        assignedHoursInBlock: parseFloat((stats.assignedSecondsInBlock / 3600).toFixed(2)),
      };
    });

    return {
      success: true,
      data: {
        entries: mappedEntries,
        projects: mappedProjects,
      },
    };
  } catch (error) {
    console.error("Failed to fetch invoice block work options:", error);
    return { success: false, error: "Failed to fetch invoice block work options" };
  }
}

/**
 * Add selected entries and/or projects to an existing active invoice block.
 * Project selections also assign current unassigned entries and live-link future entries.
 */
export async function assignWorkToInvoiceBlock(input: {
  blockId: string;
  entryIds?: string[];
  projectIds?: string[];
}) {
  const parsed = assignWorkSchema.safeParse({
    ...input,
    entryIds: dedupeIds(input.entryIds || []),
    projectIds: dedupeIds(input.projectIds || []),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  if (parsed.data.entryIds.length === 0 && parsed.data.projectIds.length === 0) {
    return { success: false, error: "Select at least one entry or project" };
  }

  try {
    const block = await prisma.invoiceBlock.findUnique({
      where: { id: parsed.data.blockId },
      select: {
        id: true,
        clientId: true,
        status: true,
      },
    });

    if (!block) {
      return { success: false, error: "Invoice block not found" };
    }

    if (block.status !== InvoiceBlockStatus.ACTIVE) {
      return { success: false, error: "Only active invoice blocks can be updated" };
    }

    const projects = await prisma.project.findMany({
      where: { clientId: block.clientId },
      select: { id: true },
    });
    const clientProjectIdSet = new Set(projects.map((p) => p.id));
    const validProjectIds = parsed.data.projectIds.filter((id) => clientProjectIdSet.has(id));

    const selectedEntries = parsed.data.entryIds.length
      ? await prisma.timeEntry.findMany({
          where: {
            id: { in: parsed.data.entryIds },
            endTime: { not: null },
          },
          select: {
            id: true,
            invoiceBlockId: true,
            clientId: true,
            project: {
              select: {
                clientId: true,
              },
            },
          },
        })
      : [];

    const eligibleEntries = selectedEntries.filter((entry) => entryBelongsToClient(entry, block.clientId));

    const entryIdsToAssign = eligibleEntries
      .filter((entry) => entry.invoiceBlockId === null)
      .map((entry) => entry.id);

    const entriesAlreadyInBlock = eligibleEntries.filter((entry) => entry.invoiceBlockId === block.id).length;
    const entriesInOtherBlocks = eligibleEntries.filter(
      (entry) => entry.invoiceBlockId !== null && entry.invoiceBlockId !== block.id
    ).length;

    const txResult = await prisma.$transaction(async (tx) => {
      if (validProjectIds.length > 0) {
        await tx.invoiceBlockProject.createMany({
          data: validProjectIds.map((projectId) => ({
            invoiceBlockId: block.id,
            projectId,
          })),
          skipDuplicates: true,
        });
      }

      const directEntryAssignResult = entryIdsToAssign.length
        ? await tx.timeEntry.updateMany({
            where: {
              id: { in: entryIdsToAssign },
              invoiceBlockId: null,
            },
            data: {
              invoiceBlockId: block.id,
            },
          })
        : { count: 0 };

      const projectEntryAssignResult = validProjectIds.length
        ? await tx.timeEntry.updateMany({
            where: {
              projectId: { in: validProjectIds },
              endTime: { not: null },
              invoiceBlockId: null,
            },
            data: {
              invoiceBlockId: block.id,
            },
          })
        : { count: 0 };

      return {
        directAssigned: directEntryAssignResult.count,
        projectAssigned: projectEntryAssignResult.count,
      };
    });

    revalidateInvoicePaths();

    return {
      success: true,
      data: {
        directEntriesAssigned: txResult.directAssigned,
        projectEntriesAssigned: txResult.projectAssigned,
        entriesAlreadyInBlock,
        entriesInOtherBlocks,
        linkedProjects: validProjectIds.length,
      },
    };
  } catch (error) {
    console.error("Failed to assign work to invoice block:", error);
    return { success: false, error: "Failed to add work to invoice block" };
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

    const blockHours = await calculateBlockHours(block.id);

    const effectiveTracked = blockHours + block.hoursCarriedForward;
    const overage = Math.max(0, effectiveTracked - block.hoursTarget);

    await prisma.invoiceBlock.update({
      where: { id: parsed.data },
      data: {
        status: InvoiceBlockStatus.COMPLETED,
        endDate: new Date(),
      },
    });

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

    revalidateInvoicePaths();
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

    revalidateInvoicePaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to update invoice block:", error);
    return { success: false, error: "Failed to update invoice block" };
  }
}

/**
 * Update a non-active invoice block status for invoicing workflow.
 */
export async function updateInvoiceBlockStatus(blockId: string, status: NonActiveInvoiceBlockStatus) {
  const parsed = updateStatusSchema.safeParse({ blockId, status });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const block = await prisma.invoiceBlock.findUnique({
      where: { id: parsed.data.blockId },
      select: {
        id: true,
        status: true,
        endDate: true,
      },
    });

    if (!block) {
      return { success: false, error: "Invoice block not found" };
    }

    if (block.status === InvoiceBlockStatus.ACTIVE) {
      return { success: false, error: "Complete the active block before updating invoice status" };
    }

    if (block.status === parsed.data.status) {
      return { success: true };
    }

    await prisma.invoiceBlock.update({
      where: { id: parsed.data.blockId },
      data: {
        status: parsed.data.status,
        endDate: block.endDate || new Date(),
      },
    });

    revalidateInvoicePaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to update invoice block status:", error);
    return { success: false, error: "Failed to update invoice block status" };
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

    revalidateInvoicePaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete invoice block:", error);
    return { success: false, error: "Failed to delete invoice block" };
  }
}
