import prisma from "@/lib/prisma";
import { Client, InvoiceBlockStatus } from "@prisma/client";
import { getActiveInvoiceBlock, getClientHoursTracked, InvoiceBlockWithHours } from "./invoice-blocks";

// Type for client with computed data
export type ClientWithData = Client & {
  hoursTracked: number;
  activeInvoiceBlock: InvoiceBlockWithHours | null;
  _count?: { projects: number };
};

export async function getClients(): Promise<Client[]> {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });
    return clients;
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}

/**
 * Get clients with computed hours and active invoice blocks
 */
export async function getClientsWithData(): Promise<ClientWithData[]> {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });

    // Fetch hours and active blocks for each client
    const clientsWithData = await Promise.all(
      clients.map(async (client) => {
        const [hoursTracked, activeInvoiceBlock] = await Promise.all([
          getClientHoursTracked(client.id),
          getActiveInvoiceBlock(client.id),
        ]);

        return {
          ...client,
          hoursTracked,
          activeInvoiceBlock,
        };
      })
    );

    return clientsWithData;
  } catch (error) {
    console.error("Failed to fetch clients with data:", error);
    return [];
  }
}

/**
 * Get a single client by ID with computed data
 */
export async function getClientById(id: string): Promise<ClientWithData | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });

    if (!client) return null;

    const [hoursTracked, activeInvoiceBlock] = await Promise.all([
      getClientHoursTracked(client.id),
      getActiveInvoiceBlock(client.id),
    ]);

    return {
      ...client,
      hoursTracked,
      activeInvoiceBlock,
    };
  } catch (error) {
    console.error(`Failed to fetch client ${id}:`, error);
    return null;
  }
}
