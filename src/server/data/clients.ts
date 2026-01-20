import prisma from "@/lib/prisma";
import { Client } from "@prisma/client";

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
