import ClientsList from "@/components/custom/ClientsList";
import { getClientsWithData } from "@/server/data/clients";
import { getInvoiceBlockHistoryBatched } from "@/server/data/invoice-blocks";
import { InvoiceBlock } from "@/types";
import { mapClient, mapInvoiceBlock } from "@/lib/mappers";

export default async function ClientsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const highlightedClientId = typeof searchParams?.highlight === 'string' ? searchParams.highlight : null;

  const [clientsData, invoiceBlockHistoryRaw] = await Promise.all([
    getClientsWithData(),
    getInvoiceBlockHistoryBatched(),
  ]);

  const clients = clientsData.map(mapClient);

  // Map Prisma invoice blocks to UI types
  const invoiceBlockHistory: Record<string, InvoiceBlock[]> = {};
  for (const [clientId, blocks] of Object.entries(invoiceBlockHistoryRaw)) {
    invoiceBlockHistory[clientId] = blocks.map(mapInvoiceBlock);
  }

  return (
    <ClientsList
      clients={clients}
      invoiceBlockHistory={invoiceBlockHistory}
      highlightedClientId={highlightedClientId}
    />
  );
}
