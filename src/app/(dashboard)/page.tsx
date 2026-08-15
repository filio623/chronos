import { redirect } from "next/navigation";
import DashboardView from "@/components/custom/DashboardView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getTimeEntries, getActiveTimer, TimeEntryWithRelations } from "@/server/data/time-entries";
import { getTags } from "@/server/data/tags";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";
import { getTrackingPrefs } from "@/lib/prefs";
import { weekRangeFromParam } from "@/lib/time";
import { weekDaysElapsed } from "@/lib/tracking";

export default async function DashboardPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  // Handle legacy ?view= redirects
  const viewParam = typeof searchParams?.view === 'string' ? searchParams.view : null;
  if (viewParam && viewParam !== 'dashboard') {
    const validViews = ['projects', 'clients', 'tracker', 'timesheet', 'reports'];
    if (validViews.includes(viewParam)) {
      redirect(`/${viewParam}`);
    }
  }

  const prefs = await getTrackingPrefs();
  const { start, endExclusive } = weekRangeFromParam(undefined, new Date(), prefs.weekStartsOn);

  const [projectsData, clientsData, entriesData, activeTimerData, tagsData, weekData] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getTimeEntries({ pageSize: 10 }),
    getActiveTimer(),
    getTags(),
    getTimeEntries({ startTimeGte: start, startTimeLt: endExclusive }),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map((client) => mapClient(client, prefs.rounding));
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const clientMap = new Map(clients.map((c: Client) => [c.id, c]));
  const entries = entriesData.entries.map((entry: TimeEntryWithRelations) => mapEntry(entry, projectMap, clientMap));
  const activeTimer = activeTimerData ? mapEntry(activeTimerData, projectMap, clientMap) : null;
  const tags = tagsData.map((tag: { id: string; name: string; color: string | null; isSystem: boolean }) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isSystem: tag.isSystem,
  }));

  const hoursThisWeekByClient: Record<string, number> = {};
  for (const entry of weekData.entries) {
    const clientId = entry.clientId;
    if (!clientId) continue;
    hoursThisWeekByClient[clientId] = (hoursThisWeekByClient[clientId] ?? 0) + ((entry.duration ?? 0) / 3600);
  }

  return (
    <DashboardView
      projects={projects}
      clients={clients}
      entries={entries}
      activeTimer={activeTimer}
      tags={tags}
      hoursThisWeekByClient={hoursThisWeekByClient}
      weekDaysElapsed={weekDaysElapsed(new Date(), prefs.weekStartsOn)}
    />
  );
}
