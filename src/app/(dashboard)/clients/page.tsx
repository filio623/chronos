import prisma from "@/lib/prisma";
import ClientsList from "@/components/custom/ClientsList";
import { getClientHoursSnapshots } from "@/server/data/block-hours-calculator";
import type { ClientWithData } from "@/server/data/clients";
import { InvoiceBlock } from "@/types";
import { mapClient, mapInvoiceBlock } from "@/lib/mappers";

export default async function ClientsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const highlightedClientId = typeof searchParams?.highlight === 'string' ? searchParams.highlight : null;

  const clientRows = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { projects: true } } },
  });

  const snapshots = await getClientHoursSnapshots(clientRows.map(c => c.id));

  const clientsData: ClientWithData[] = clientRows.map(client => {
    const snap = snapshots.get(client.id)!;
    return {
      ...client,
      hoursTracked: snap.totalHoursTracked,
      activeInvoiceBlock: snap.activeBlock,
    };
  });

  const clients = clientsData.map(mapClient);

  const invoiceBlockHistory: Record<string, InvoiceBlock[]> = {};
  for (const client of clientsData) {
    const snap = snapshots.get(client.id)!;
    invoiceBlockHistory[client.id] = snap.blockHistory.map(mapInvoiceBlock);
  }

  return (
    <ClientsList
      clients={clients}
      invoiceBlockHistory={invoiceBlockHistory}
      highlightedClientId={highlightedClientId}
    />
  );
}
