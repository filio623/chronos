import TimesheetView from "@/components/custom/TimesheetView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getTimeEntries, TimeEntryWithRelations } from "@/server/data/time-entries";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";
import { weekRangeFromParam } from "@/lib/time";
import { getTrackingPrefs } from "@/lib/prefs";

export default async function TimesheetPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const weekParam = typeof searchParams?.week === "string" ? searchParams.week : undefined;
  const prefs = await getTrackingPrefs();
  const { start, endExclusive, weekStartKey } = weekRangeFromParam(weekParam, new Date(), prefs.weekStartsOn);

  const [projectsData, clientsData, entriesData] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getTimeEntries({ startTimeGte: start, startTimeLt: endExclusive }),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map((client) => mapClient(client, prefs.rounding));
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const clientMap = new Map(clients.map((c: Client) => [c.id, c]));
  const entries = entriesData.entries.map((entry: TimeEntryWithRelations) => mapEntry(entry, projectMap, clientMap));

  return (
    <TimesheetView
      projects={projects}
      clients={clients}
      entries={entries}
      weekStart={weekStartKey}
      weekStartsOn={prefs.weekStartsOn}
    />
  );
}
