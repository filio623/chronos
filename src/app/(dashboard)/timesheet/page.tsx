import TimesheetView from "@/components/custom/TimesheetView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getTimeEntries, TimeEntryWithRelations } from "@/server/data/time-entries";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";

export default async function TimesheetPage() {
  const [projectsData, clientsData, entriesData] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getTimeEntries(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const clientMap = new Map(clients.map((c: Client) => [c.id, c]));
  const entries = entriesData.map((entry: TimeEntryWithRelations) => mapEntry(entry, projectMap, clientMap));

  return (
    <TimesheetView
      projects={projects}
      clients={clients}
      entries={entries}
    />
  );
}
