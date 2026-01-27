import prisma from "@/lib/prisma";
import { InvoiceBlock, InvoiceBlockStatus } from "@prisma/client";

export type InvoiceBlockWithHours = InvoiceBlock & {
  hoursTracked: number;
  progressPercent: number;
};

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

    // Calculate hours tracked for this block
    const hoursTracked = await calculateBlockHours(clientId, block.startDate, block.endDate);
    const totalAvailable = block.hoursTarget + block.hoursCarriedForward;
    const progressPercent = totalAvailable > 0 ? (hoursTracked / totalAvailable) * 100 : 0;

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
        const hoursTracked = await calculateBlockHours(clientId, block.startDate, block.endDate);
        const totalAvailable = block.hoursTarget + block.hoursCarriedForward;
        const progressPercent = totalAvailable > 0 ? (hoursTracked / totalAvailable) * 100 : 0;

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
 * Calculate total hours tracked for a client within a date range
 */
export async function calculateBlockHours(
  clientId: string,
  startDate: Date,
  endDate: Date | null
): Promise<number> {
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
          startTime: { gte: startDate },
          ...(endDate ? { startTime: { lte: endDate } } : {}),
          endTime: { not: null },
          clientId,
        },
        _sum: { duration: true },
      });

      const totalSeconds = result._sum.duration || 0;
      return parseFloat((totalSeconds / 3600).toFixed(2));
    }

    // Sum time entries within the date range
    const result = await prisma.timeEntry.aggregate({
      where: {
        startTime: { gte: startDate },
        ...(endDate ? { startTime: { lte: endDate } } : {}),
        endTime: { not: null }, // Only completed entries
        OR: [
          { projectId: { in: projectIds } },
          { clientId },
        ],
      },
      _sum: { duration: true },
    });

    // Convert seconds to hours
    const totalSeconds = result._sum.duration || 0;
    return parseFloat((totalSeconds / 3600).toFixed(2));
  } catch (error) {
    console.error(`Failed to calculate block hours for client ${clientId}:`, error);
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
