import ClientsList from "@/components/custom/ClientsList";
import { getClientsWithData, ClientWithData } from "@/server/data/clients";
import { getInvoiceBlockHistory } from "@/server/data/invoice-blocks";
import { Client, InvoiceBlock, InvoiceBlockStatus } from "@/types";
import { InvoiceBlock as PrismaInvoiceBlock } from "@prisma/client";

const mapInvoiceBlock = (b: PrismaInvoiceBlock & { hoursTracked: number; progressPercent: number }): InvoiceBlock => ({
  id: b.id,
  clientId: b.clientId,
  hoursTarget: b.hoursTarget,
  hoursCarriedForward: b.hoursCarriedForward,
  startDate: b.startDate.toISOString(),
  endDate: b.endDate ? b.endDate.toISOString() : null,
  status: b.status as InvoiceBlockStatus,
  notes: b.notes ?? undefined,
  hoursTracked: b.hoursTracked,
  progressPercent: b.progressPercent,
});

const mapClient = (c: ClientWithData): Client => ({
  id: c.id,
  name: c.name,
  address: c.address ?? undefined,
  currency: c.currency,
  color: c.color,
  budgetLimit: c.budgetLimit,
  hoursTracked: c.hoursTracked,
  activeInvoiceBlock: c.activeInvoiceBlock ? mapInvoiceBlock(c.activeInvoiceBlock) : null,
  defaultBillable: c.defaultBillable,
  defaultRate: c.defaultRate,
});

export default async function ClientsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const highlightedClientId = typeof searchParams?.highlight === 'string' ? searchParams.highlight : null;

  const clientsData = await getClientsWithData();
  const clients = clientsData.map(mapClient);

  // Fetch invoice block history for all clients (N+1 for now, fixed in Phase 2c)
  const invoiceBlockHistoryPromises = clientsData.map(async (client: ClientWithData) => {
    const history = await getInvoiceBlockHistory(client.id);
    return { clientId: client.id, history: history.map(mapInvoiceBlock) };
  });
  const invoiceBlockHistoryData = await Promise.all(invoiceBlockHistoryPromises);
  const invoiceBlockHistory: Record<string, InvoiceBlock[]> = {};
  invoiceBlockHistoryData.forEach(({ clientId, history }) => {
    invoiceBlockHistory[clientId] = history;
  });

  return (
    <ClientsList
      clients={clients}
      invoiceBlockHistory={invoiceBlockHistory}
      highlightedClientId={highlightedClientId}
    />
  );
}
