import ReportsView from "@/components/custom/ReportsView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData, ClientWithData } from "@/server/data/clients";
import { getSummaryMetrics, getDailyActivity, getDailyActivityGrouped, getProjectDistribution } from "@/server/data/reports";
import { Project, Client, InvoiceBlockStatus } from "@/types";
import { InvoiceBlock as PrismaInvoiceBlock } from "@prisma/client";
import { subDays, startOfDay, endOfDay } from "date-fns";

type ProjectWithHours = Awaited<ReturnType<typeof getProjects>>["projects"][number];

const mapProject = (p: ProjectWithHours): Project => ({
  id: p.id,
  name: p.name,
  client: p.client?.name || "No Client",
  clientId: p.clientId,
  color: p.color,
  hoursUsed: p.hoursUsed,
  hoursTotal: p.budgetLimit,
  isFavorite: p.isFavorite,
  isArchived: p.isArchived,
  defaultBillable: p.defaultBillable,
  hourlyRate: p.hourlyRate,
});

const mapInvoiceBlock = (b: PrismaInvoiceBlock & { hoursTracked: number; progressPercent: number }) => ({
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

export default async function ReportsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 30));

  const reportFilters = {
    projectId: typeof searchParams?.project === 'string' ? searchParams.project : undefined,
    clientId: typeof searchParams?.client === 'string' ? searchParams.client : undefined,
    groupBy: typeof searchParams?.groupBy === 'string' ? searchParams.groupBy as 'project' | 'client' | 'day' : 'project' as const,
    from: typeof searchParams?.from === 'string' ? startOfDay(new Date(searchParams.from)) : startDate,
    to: typeof searchParams?.to === 'string' ? endOfDay(new Date(searchParams.to)) : endDate,
  };

  const [projectsData, clientsData, summaryMetrics, dailyActivity, dailyActivityGrouped, projectDistribution] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getSummaryMetrics(reportFilters.from, reportFilters.to, reportFilters),
    getDailyActivity(reportFilters.from, reportFilters.to, reportFilters),
    getDailyActivityGrouped(reportFilters.from, reportFilters.to, reportFilters),
    getProjectDistribution(reportFilters.from, reportFilters.to, reportFilters),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);

  return (
    <ReportsView
      data={{
        summary: summaryMetrics,
        dailyActivity,
        dailyActivityGrouped,
        projectDistribution,
      }}
      projects={projects.map(p => ({ id: p.id, name: p.name, clientId: p.clientId }))}
      clients={clients.map(c => ({ id: c.id, name: c.name, currency: c.currency }))}
    />
  );
}
