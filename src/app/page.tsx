import MainDashboard from "@/components/custom/MainDashboard";
import { getProjects } from "@/server/data/projects";
import { getClients } from "@/server/data/clients";
import { getTimeEntries, getActiveTimer } from "@/server/data/time-entries";
import { getSummaryMetrics, getDailyActivity, getProjectDistribution } from "@/server/data/reports";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Project, Client, TimeEntry } from "@/types";

/**
 * Mappers to convert Prisma models to our UI Types
 */
const mapProject = (p: any): Project => {
  const totalSeconds = p.timeEntries?.reduce((acc: number, entry: any) => acc + (entry.duration || 0), 0) || 0;
  const totalHours = totalSeconds / 3600;

  return {
    id: p.id,
    name: p.name,
    client: p.client?.name || "No Client",
    clientId: p.clientId,
    color: p.color,
    hoursUsed: parseFloat(totalHours.toFixed(2)),
    hoursTotal: p.budgetLimit,
    isFavorite: p.isFavorite,
  };
};

const mapClient = (c: any): Client => ({
  id: c.id,
  name: c.name,
  address: c.address,
  currency: c.currency,
});

const mapEntry = (e: any): TimeEntry => {
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

export default async function Home() {
  // Default range: Last 30 days
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 30));

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
    getProjects(),
    getClients(),
    getTimeEntries(),
    getActiveTimer(),
    getSummaryMetrics(startDate, endDate),
    getDailyActivity(startDate, endDate),
    getProjectDistribution(startDate, endDate)
  ]);

  // Map to UI types
  const projects = projectsData.map(mapProject);
  const clients = clientsData.map(mapClient);
  const entries = entriesData.map(mapEntry);
  const activeTimer = activeTimerData ? mapEntry(activeTimerData) : null;

  return (
    <MainDashboard 
      initialProjects={projects}
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
