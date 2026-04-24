import prisma from "@/lib/prisma";
import { InvoiceBlock, InvoiceBlockStatus, Prisma } from "@prisma/client";

export interface EnrichedBlock extends InvoiceBlock {
  hoursTracked: number;    // blockHours + carriedForward
  progressPercent: number; // hoursTracked / hoursTarget * 100, clamped to [0, 100]
}

export interface ClientHoursSnapshot {
  clientId: string;
  totalHoursTracked: number;          // all-time, direct + via projects
  activeBlock: EnrichedBlock | null;
  blockHistory: EnrichedBlock[];      // non-active, newest first
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2));
}

export function enrichBlock(block: InvoiceBlock, blockHours: number): EnrichedBlock {
  const hoursTracked = round2(blockHours + block.hoursCarriedForward);
  const progressPercent = block.hoursTarget > 0
    ? Math.max(0, (hoursTracked / block.hoursTarget) * 100)
    : 0;
  return { ...block, hoursTracked, progressPercent };
}

/**
 * Hours per block via groupBy. 1 query regardless of N.
 * Every requested blockId is present in the returned Map (zero-filled if no entries).
 */
export async function getBlockHoursMap(blockIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of blockIds) map.set(id, 0);
  if (blockIds.length === 0) return map;

  const rows = await prisma.timeEntry.groupBy({
    by: ["invoiceBlockId"],
    where: {
      invoiceBlockId: { in: blockIds },
      endTime: { not: null },
    },
    _sum: { duration: true },
  });

  for (const row of rows) {
    if (row.invoiceBlockId) {
      const totalSeconds = row._sum.duration || 0;
      map.set(row.invoiceBlockId, round2(totalSeconds / 3600));
    }
  }
  return map;
}

/**
 * All-time hours per client (direct + via project). Bounded queries regardless of N.
 * Every requested clientId is present in the Map.
 */
export async function getClientAllTimeHoursMap(clientIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of clientIds) map.set(id, 0);
  if (clientIds.length === 0) return map;

  // Two parallel groupBys: entries directly tagged with clientId, entries via project.
  const [directRows, projectRows] = await Promise.all([
    prisma.timeEntry.groupBy({
      by: ["clientId"],
      where: {
        clientId: { in: clientIds },
        endTime: { not: null },
      },
      _sum: { duration: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["projectId"],
      where: {
        endTime: { not: null },
        project: { clientId: { in: clientIds } },
      },
      _sum: { duration: true },
    }),
  ]);

  // Need projectId -> clientId mapping to fold project sums into client totals.
  const projects = await prisma.project.findMany({
    where: { clientId: { in: clientIds } },
    select: { id: true, clientId: true },
  });
  const projectToClient = new Map<string, string>();
  for (const p of projects) {
    if (p.clientId) projectToClient.set(p.id, p.clientId);
  }

  // Accumulate seconds per client, then convert to hours at the end.
  const secondsByClient = new Map<string, number>();
  for (const id of clientIds) secondsByClient.set(id, 0);

  for (const row of directRows) {
    if (row.clientId) {
      secondsByClient.set(row.clientId, (secondsByClient.get(row.clientId) ?? 0) + (row._sum.duration ?? 0));
    }
  }
  for (const row of projectRows) {
    if (!row.projectId) continue;
    const cid = projectToClient.get(row.projectId);
    if (!cid) continue;
    secondsByClient.set(cid, (secondsByClient.get(cid) ?? 0) + (row._sum.duration ?? 0));
  }

  for (const [cid, seconds] of secondsByClient) {
    map.set(cid, round2(seconds / 3600));
  }
  return map;
}

/** Enriched block per blockId. Uses getBlockHoursMap internally + one block fetch. */
export async function getEnrichedBlocks(blockIds: string[]): Promise<Map<string, EnrichedBlock>> {
  const result = new Map<string, EnrichedBlock>();
  if (blockIds.length === 0) return result;

  const [blocks, hoursMap] = await Promise.all([
    prisma.invoiceBlock.findMany({ where: { id: { in: blockIds } } }),
    getBlockHoursMap(blockIds),
  ]);

  for (const block of blocks) {
    result.set(block.id, enrichBlock(block, hoursMap.get(block.id) ?? 0));
  }
  return result;
}

/**
 * THE hot path. Replaces getClientsWithData + getInvoiceBlockHistoryBatched.
 * Query budget: ≤4 queries regardless of N.
 *   1. invoiceBlock.findMany for all clientIds (active + history)
 *   2. timeEntry.groupBy by invoiceBlockId for all fetched blockIds
 *   3. timeEntry.groupBy for client-direct entries
 *   4. timeEntry.groupBy for entries via projects (+ 1 small project lookup)
 *
 * Every requested clientId is guaranteed present in the Map (zero-filled).
 */
export async function getClientHoursSnapshots(
  clientIds: string[],
): Promise<Map<string, ClientHoursSnapshot>> {
  const snapshots = new Map<string, ClientHoursSnapshot>();
  for (const id of clientIds) {
    snapshots.set(id, {
      clientId: id,
      totalHoursTracked: 0,
      activeBlock: null,
      blockHistory: [],
    });
  }
  if (clientIds.length === 0) return snapshots;

  const blocks = await prisma.invoiceBlock.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { startDate: "desc" },
  });

  const [blockHoursMap, clientHoursMap] = await Promise.all([
    getBlockHoursMap(blocks.map(b => b.id)),
    getClientAllTimeHoursMap(clientIds),
  ]);

  for (const cid of clientIds) {
    const snap = snapshots.get(cid)!;
    snap.totalHoursTracked = clientHoursMap.get(cid) ?? 0;
  }

  for (const block of blocks) {
    const enriched = enrichBlock(block, blockHoursMap.get(block.id) ?? 0);
    const snap = snapshots.get(block.clientId);
    if (!snap) continue;
    if (block.status === InvoiceBlockStatus.ACTIVE && !snap.activeBlock) {
      snap.activeBlock = enriched;
    } else {
      snap.blockHistory.push(enriched);
    }
  }

  return snapshots;
}

/** Single-entity primitive for write paths. Optionally participates in a tx. */
export async function getBlockHours(
  blockId: string,
  opts?: { tx?: Prisma.TransactionClient },
): Promise<number> {
  const db = opts?.tx ?? prisma;
  const result = await db.timeEntry.aggregate({
    where: {
      invoiceBlockId: blockId,
      endTime: { not: null },
    },
    _sum: { duration: true },
  });
  const totalSeconds = result._sum.duration || 0;
  return round2(totalSeconds / 3600);
}
