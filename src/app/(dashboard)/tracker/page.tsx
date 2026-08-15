import TrackerPageClient from "@/components/custom/TrackerPageClient";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getTimeEntries, TimeEntryWithRelations } from "@/server/data/time-entries";
import { getTags } from "@/server/data/tags";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";
import { parsePageParam } from "@/lib/time";
import { firstParam, parseTrackerFilters } from "@/lib/tracking";

const PAGE_SIZE = 50;

export default async function TrackerPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const page = parsePageParam(typeof searchParams?.page === "string" ? searchParams.page : firstParam(searchParams?.page));
  const filters = parseTrackerFilters({
    q: firstParam(searchParams?.q),
    project: firstParam(searchParams?.project),
    client: firstParam(searchParams?.client),
    billable: firstParam(searchParams?.billable),
  });

  const [projectsData, clientsData, entriesData, tagsData] = await Promise.all([
    getProjects({ status: "active", pageSize: 500 }),
    getClientsWithData(),
    getTimeEntries({
      page,
      pageSize: PAGE_SIZE,
      q: filters.q,
      projectId: filters.projectId,
      clientId: filters.clientId,
      isBillable: filters.isBillable,
    }),
    getTags(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map((client) => mapClient(client));
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const clientMap = new Map(clients.map((c: Client) => [c.id, c]));
  const entries = entriesData.entries.map((entry: TimeEntryWithRelations) => mapEntry(entry, projectMap, clientMap));
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
        totalCount={entriesData.totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        filters={{
          q: filters.q ?? "",
          project: filters.projectId ?? "",
          client: filters.clientId ?? "",
          billable: filters.isBillable === true ? "yes" : filters.isBillable === false ? "no" : "",
        }}
      />
    </section>
  );
}
