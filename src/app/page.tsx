import MainDashboard from "@/components/custom/MainDashboard";
import { getProjects, ProjectWithHours } from "@/server/data/projects";
import { getClientsWithData, ClientWithData } from "@/server/data/clients";
import { getTimeEntries, getActiveTimer, TimeEntryWithRelations } from "@/server/data/time-entries";
import { getTags } from "@/server/data/tags";
import { getSummaryMetrics, getDailyActivity, getDailyActivityGrouped, getProjectDistribution } from "@/server/data/reports";
import { getInvoiceBlockHistory } from "@/server/data/invoice-blocks";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Project, Client, TimeEntry, InvoiceBlock, InvoiceBlockStatus } from "@/types";
import { TimeEntry as PrismaTimeEntry, InvoiceBlock as PrismaInvoiceBlock } from "@prisma/client";

/**
 * Mappers to convert Prisma models to our UI Types
 */
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

const mapEntry = (
  e: PrismaTimeEntry | TimeEntryWithRelations,
  projectMap: Map<string, Project>,
  clientMap: Map<string, Client>
): TimeEntry => {
  const pausedSeconds = e.pausedSeconds ?? 0;
  const pausedAt = e.pausedAt ?? null;
  const isPaused = !e.endTime && !!pausedAt;
  const effectiveEnd = e.endTime
    ? e.endTime.getTime()
    : pausedAt
      ? pausedAt.getTime()
      : Date.now();
  const computedSeconds = Math.floor((effectiveEnd - e.startTime.getTime()) / 1000) - pausedSeconds;
  const durationSeconds = e.duration ?? Math.max(0, computedSeconds);
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const entryRateOverride = (e as PrismaTimeEntry & { rateOverride?: number | null }).rateOverride ?? null;
  const project = projectMap.get(e.projectId || '');
  const clientId = e.clientId ?? project?.clientId ?? null;
  const client = clientId ? clientMap.get(clientId) : null;

  let effectiveRate: number | null = null;
  let rateSource: 'entry' | 'project' | 'client' | 'none' = 'none';

  if (entryRateOverride !== null && entryRateOverride !== undefined) {
    effectiveRate = entryRateOverride;
    rateSource = 'entry';
  } else if (project?.hourlyRate !== null && project?.hourlyRate !== undefined) {
    effectiveRate = project.hourlyRate;
    rateSource = 'project';
  } else if (client?.defaultRate !== null && client?.defaultRate !== undefined) {
    effectiveRate = client.defaultRate;
    rateSource = 'client';
  }

  return {
    id: e.id,
    description: e.description || "",
    projectId: e.projectId || "",
    clientId: e.clientId ?? null,
    date: e.startTime.toISOString(),
    startTime: e.startTime.toISOString(),
    startTimeISO: e.startTime.toISOString(),
    pausedAtISO: pausedAt ? pausedAt.toISOString() : null,
    pausedSeconds,
    isPaused,
    endTime: e.endTime ? e.endTime.toISOString() : isPaused ? "Paused" : "Running...",
    duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    durationSeconds: durationSeconds,
    isBillable: e.isBillable,
    rateOverride: entryRateOverride,
    effectiveRate,
    rateSource,
    currency: client?.currency ?? 'USD',
    tags: (e as TimeEntryWithRelations).tags?.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      isSystem: t.isSystem,
    })),
  };
};

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  
  // Default range: Last 30 days
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 30));

  const reportFilters = {
    projectId: typeof searchParams?.project === 'string' ? searchParams.project : undefined,
    clientId: typeof searchParams?.client === 'string' ? searchParams.client : undefined,
    groupBy: typeof searchParams?.groupBy === 'string' ? searchParams.groupBy as 'project' | 'client' | 'day' : 'project',
    tab: typeof searchParams?.reportTab === 'string' ? searchParams.reportTab as 'summary' | 'detailed' | 'weekly' | 'shared' : 'summary',
    from: typeof searchParams?.from === 'string' ? startOfDay(new Date(searchParams.from)) : startDate,
    to: typeof searchParams?.to === 'string' ? endOfDay(new Date(searchParams.to)) : endDate,
  };

  // Parse filters
  const projectFilters = {
    search: typeof searchParams?.search === 'string' ? searchParams.search : undefined,
    clientId: typeof searchParams?.client === 'string' ? searchParams.client : undefined,
    status: typeof searchParams?.status === 'string' ? (searchParams.status as 'active' | 'archived') : 'active',
    sortBy: typeof searchParams?.sortBy === 'string' ? (searchParams.sortBy as 'name' | 'client' | 'hoursUsed' | 'updatedAt') : 'updatedAt',
    sortOrder: typeof searchParams?.sortOrder === 'string' ? (searchParams.sortOrder as 'asc' | 'desc') : 'desc',
    page: typeof searchParams?.page === 'string' ? parseInt(searchParams.page, 10) : 1,
    pageSize: 10,
  };

  // Fetch data in parallel
  const [
    projectsData,
    clientsData,
    entriesData,
    activeTimerData,
    summaryMetrics,
    dailyActivity,
    dailyActivityGrouped,
    projectDistribution,
    tagsData
  ] = await Promise.all([
    getProjects(projectFilters),
    getClientsWithData(),
    getTimeEntries(),
    getActiveTimer(),
    getSummaryMetrics(reportFilters.from, reportFilters.to, reportFilters),
    getDailyActivity(reportFilters.from, reportFilters.to, reportFilters),
    getDailyActivityGrouped(reportFilters.from, reportFilters.to, reportFilters),
    getProjectDistribution(reportFilters.from, reportFilters.to, reportFilters),
    getTags()
  ]);

  // Fetch invoice block history for all clients
  const invoiceBlockHistoryPromises = clientsData.map(async (client) => {
    const history = await getInvoiceBlockHistory(client.id);
    return { clientId: client.id, history: history.map(mapInvoiceBlock) };
  });
  const invoiceBlockHistoryData = await Promise.all(invoiceBlockHistoryPromises);
  const invoiceBlockHistory: Record<string, InvoiceBlock[]> = {};
  invoiceBlockHistoryData.forEach(({ clientId, history }) => {
    invoiceBlockHistory[clientId] = history;
  });

  // Map to UI types
  const projects = projectsData.projects.map(mapProject);
  const projectsCount = projectsData.totalCount;
  const clients = clientsData.map(mapClient);
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const entries = entriesData.map((entry) => mapEntry(entry, projectMap, clientMap));
  const activeTimer = activeTimerData ? mapEntry(activeTimerData, projectMap, clientMap) : null;
  const tags = tagsData.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isSystem: tag.isSystem,
  }));

  return (
    <MainDashboard
      initialProjects={projects}
      projectsCount={projectsCount}
      initialClients={clients}
      initialEntries={entries}
      activeTimer={activeTimer}
      initialTags={tags}
      invoiceBlockHistory={invoiceBlockHistory}
      reportData={{
        summary: summaryMetrics,
        dailyActivity,
        dailyActivityGrouped,
        projectDistribution
      }}
    />
  );
}
