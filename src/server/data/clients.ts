import prisma from "@/lib/prisma";
import { Client } from "@prisma/client";
import { getClientHoursSnapshots, type EnrichedBlock } from "./block-hours-calculator";

export type ClientWithData = Client & {
  hoursTracked: number;
  activeInvoiceBlock: EnrichedBlock | null;
  _count?: { projects: number };
};

export async function getClients(): Promise<Client[]> {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });
    return clients;
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}

/**
 * Get clients with computed hours and active invoice blocks.
 * Bounded query budget regardless of client count.
 */
export async function getClientsWithData(): Promise<ClientWithData[]> {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });

    if (clients.length === 0) return [];

    const snapshots = await getClientHoursSnapshots(clients.map(c => c.id));

    return clients.map(client => {
      const snap = snapshots.get(client.id)!;
      return {
        ...client,
        hoursTracked: snap.totalHoursTracked,
        activeInvoiceBlock: snap.activeBlock,
      };
    });
  } catch (error) {
    console.error("Failed to fetch clients with data:", error);
    return [];
  }
}

export async function getClientById(id: string): Promise<ClientWithData | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!client) return null;

    const snap = (await getClientHoursSnapshots([id])).get(id)!;

    return {
      ...client,
      hoursTracked: snap.totalHoursTracked,
      activeInvoiceBlock: snap.activeBlock,
    };
  } catch (error) {
    console.error(`Failed to fetch client ${id}:`, error);
    return null;
  }
}
