import AppShell from "@/components/custom/AppShell";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getActiveTimer, getTimeEntries } from "@/server/data/time-entries";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";
import { getTrackingPrefs } from "@/lib/prefs";
import { defaultLocalDateKey, weekRangeFromParam } from "@/lib/time";
import { uniqueRecentTasks } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefs = await getTrackingPrefs();
  const { start, endExclusive } = weekRangeFromParam(undefined, new Date(), prefs.weekStartsOn);

  const [projectsData, clientsData, activeTimerData, recentData, weekData] = await Promise.all([
    getProjects({ status: "active", pageSize: 500 }),
    getClientsWithData(),
    getActiveTimer(),
    getTimeEntries({ pageSize: 20 }),
    getTimeEntries({ startTimeGte: start, startTimeLt: endExclusive }),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map((client) => mapClient(client, prefs.rounding));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const activeTimer = activeTimerData
    ? mapEntry(activeTimerData, projectMap, clientMap)
    : null;
  const recentEntries = recentData.entries.map((entry) => mapEntry(entry, projectMap, clientMap));
  const weekEntries = weekData.entries.map((entry) => mapEntry(entry, projectMap, clientMap));
  const recents = uniqueRecentTasks(
    recentEntries.map((entry) => ({
      projectId: entry.projectId || null,
      description: entry.description,
      isBillable: entry.isBillable,
    })),
  );

  return (
    <AppShell
      initialProjects={projects}
      initialClients={clients}
      activeTimer={activeTimer}
      recents={recents}
      weekEntries={weekEntries}
      todayKey={defaultLocalDateKey()}
      weekStartsOn={prefs.weekStartsOn}
      rounding={prefs.rounding}
    >
      {children}
    </AppShell>
  );
}
