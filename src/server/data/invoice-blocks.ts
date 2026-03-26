import prisma from "@/lib/prisma";
import { InvoiceBlock, InvoiceBlockStatus } from "@prisma/client";

export type InvoiceBlockWithHours = InvoiceBlock & {
  hoursTracked: number;
  progressPercent: number;
};

function getEffectiveTrackedHours(blockHours: number, carriedForward: number): number {
  return parseFloat((blockHours + carriedForward).toFixed(2));
}

/**
 * Get the currently active invoice block for a client
 */
export async function getActiveInvoiceBlock(clientId: string): Promise<InvoiceBlockWithHours | null> {
  try {
    const block = await prisma.invoiceBlock.findFirst({
      where: {
        clientId,
        status: InvoiceBlockStatus.ACTIVE,
      },
    });

    if (!block) return null;

    // Effective tracked hours include prior overage carried into this block.
    const blockHours = await calculateBlockHours(block.id);
    const hoursTracked = getEffectiveTrackedHours(blockHours, block.hoursCarriedForward);
    const progressPercent = block.hoursTarget > 0 ? (hoursTracked / block.hoursTarget) * 100 : 0;

    return {
      ...block,
      hoursTracked,
      progressPercent,
    };
  } catch (error) {
    console.error(`Failed to fetch active invoice block for client ${clientId}:`, error);
    return null;
  }
}

/**
 * Get all invoice blocks for a client (history)
 */
export async function getInvoiceBlockHistory(clientId: string): Promise<InvoiceBlockWithHours[]> {
  try {
    const blocks = await prisma.invoiceBlock.findMany({
      where: { clientId },
      orderBy: { startDate: 'desc' },
    });

    // Calculate hours for each block
    const blocksWithHours = await Promise.all(
      blocks.map(async (block) => {
        const blockHours = await calculateBlockHours(block.id);
        const hoursTracked = getEffectiveTrackedHours(blockHours, block.hoursCarriedForward);
        const progressPercent = block.hoursTarget > 0 ? (hoursTracked / block.hoursTarget) * 100 : 0;

        return {
          ...block,
          hoursTracked,
          progressPercent,
        };
      })
    );

    return blocksWithHours;
  } catch (error) {
    console.error(`Failed to fetch invoice block history for client ${clientId}:`, error);
    return [];
  }
}

/**
 * Get invoice block history for all clients in a single query (fixes N+1)
 */
export async function getInvoiceBlockHistoryBatched(): Promise<Record<string, InvoiceBlockWithHours[]>> {
  try {
    const blocks = await prisma.invoiceBlock.findMany({
      orderBy: { startDate: 'desc' },
    });

    if (blocks.length === 0) return {};

    // Batch calculate hours for all blocks
    const blockIds = blocks.map(b => b.id);
    const hoursByBlock = await calculateBlockHoursBatched(blockIds);

    // Group by clientId
    const result: Record<string, InvoiceBlockWithHours[]> = {};
    for (const block of blocks) {
      const blockHours = hoursByBlock.get(block.id) ?? 0;
      const hoursTracked = getEffectiveTrackedHours(blockHours, block.hoursCarriedForward);
      const progressPercent = block.hoursTarget > 0 ? (hoursTracked / block.hoursTarget) * 100 : 0;

      if (!result[block.clientId]) {
        result[block.clientId] = [];
      }
      result[block.clientId].push({
        ...block,
        hoursTracked,
        progressPercent,
      });
    }

    return result;
  } catch (error) {
    console.error("Failed to fetch batched invoice block history:", error);
    return {};
  }
}

/**
 * Calculate hours for multiple blocks in a single query
 */
async function calculateBlockHoursBatched(blockIds: string[]): Promise<Map<string, number>> {
  try {
    const results = await prisma.timeEntry.groupBy({
      by: ['invoiceBlockId'],
      where: {
        invoiceBlockId: { in: blockIds },
        endTime: { not: null },
      },
      _sum: { duration: true },
    });

    const map = new Map<string, number>();
    for (const row of results) {
      if (row.invoiceBlockId) {
        const totalSeconds = row._sum.duration || 0;
        map.set(row.invoiceBlockId, parseFloat((totalSeconds / 3600).toFixed(2)));
      }
    }
    return map;
  } catch (error) {
    console.error("Failed to batch calculate block hours:", error);
    return new Map();
  }
}

/**
 * Calculate total hours tracked for a specific invoice block
 */
export async function calculateBlockHours(
  blockId: string
): Promise<number> {
  try {
    const result = await prisma.timeEntry.aggregate({
      where: {
        invoiceBlockId: blockId,
        endTime: { not: null }, // Only completed entries
      },
      _sum: { duration: true },
    });

    // Convert seconds to hours
    const totalSeconds = result._sum.duration || 0;
    return parseFloat((totalSeconds / 3600).toFixed(2));
  } catch (error) {
    console.error(`Failed to calculate block hours for block ${blockId}:`, error);
    return 0;
  }
}

/**
 * Get hours tracked for a client (all time or within active block)
 */
export async function getClientHoursTracked(clientId: string): Promise<number> {
  try {
    // Get all project IDs for this client
    const projects = await prisma.project.findMany({
      where: { clientId },
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      const result = await prisma.timeEntry.aggregate({
        where: {
          endTime: { not: null },
          clientId,
        },
        _sum: { duration: true },
      });

      const totalSeconds = result._sum.duration || 0;
      return parseFloat((totalSeconds / 3600).toFixed(2));
    }

    // Sum all time entries
    const result = await prisma.timeEntry.aggregate({
      where: {
        endTime: { not: null },
        OR: [
          { projectId: { in: projectIds } },
          { clientId },
        ],
      },
      _sum: { duration: true },
    });

    const totalSeconds = result._sum.duration || 0;
    return parseFloat((totalSeconds / 3600).toFixed(2));
  } catch (error) {
    console.error(`Failed to get hours for client ${clientId}:`, error);
    return 0;
  }
}
