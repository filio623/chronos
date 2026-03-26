import TrackerPageClient from "@/components/custom/TrackerPageClient";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getTimeEntries, TimeEntryWithRelations } from "@/server/data/time-entries";
import { getTags } from "@/server/data/tags";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";

export default async function TrackerPage() {
  const [projectsData, clientsData, entriesData, tagsData] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getTimeEntries(),
    getTags(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const clientMap = new Map(clients.map((c: Client) => [c.id, c]));
  const entries = entriesData.map((entry: TimeEntryWithRelations) => mapEntry(entry, projectMap, clientMap));
  const tags = tagsData.map((tag: { id: string; name: string; color: string | null; isSystem: boolean }) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isSystem: tag.isSystem,
  }));

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Time Entries</h2>
      </div>
      <TrackerPageClient
        entries={entries}
        projects={projects}
        clients={clients}
        tags={tags}
      />
    </section>
  );
}
