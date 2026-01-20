import MainDashboard from "@/components/custom/MainDashboard";
import { getProjects, ProjectWithHours } from "@/server/data/projects";
import { getClients } from "@/server/data/clients";
import { getTimeEntries, getActiveTimer } from "@/server/data/time-entries";
import { getSummaryMetrics, getDailyActivity, getProjectDistribution } from "@/server/data/reports";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Project, Client, TimeEntry } from "@/types";
import { Client as PrismaClient, TimeEntry as PrismaTimeEntry } from "@prisma/client";

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
});

const mapClient = (c: PrismaClient): Client => ({
  id: c.id,
  name: c.name,
  address: c.address ?? undefined,
  currency: c.currency,
});

const mapEntry = (e: PrismaTimeEntry): TimeEntry => {
  const durationSeconds = e.duration || 0;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  return {
    id: e.id,
    description: e.description || "",
    projectId: e.projectId || "",
    date: format(e.startTime, "yyyy-MM-dd"),
    startTime: format(e.startTime, "hh:mm a"),
    endTime: e.endTime ? format(e.endTime, "hh:mm a") : "Running...",
    duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    durationSeconds: durationSeconds,
    isBillable: e.isBillable,
  };
};

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  
  // Default range: Last 30 days
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 30));

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
    projectDistribution
  ] = await Promise.all([
    getProjects(projectFilters),
    getClients(),
    getTimeEntries(),
    getActiveTimer(),
    getSummaryMetrics(startDate, endDate),
    getDailyActivity(startDate, endDate),
    getProjectDistribution(startDate, endDate)
  ]);

  // Map to UI types
  const projects = projectsData.projects.map(mapProject);
  const projectsCount = projectsData.totalCount;
  const clients = clientsData.map(mapClient);
  const entries = entriesData.map(mapEntry);
  const activeTimer = activeTimerData ? mapEntry(activeTimerData) : null;

  return (
    <MainDashboard
      initialProjects={projects}
      projectsCount={projectsCount}
      initialClients={clients}
      initialEntries={entries}
      activeTimer={activeTimer}
      reportData={{
        summary: summaryMetrics,
        dailyActivity,
        projectDistribution
      }}
    />
  );
}
