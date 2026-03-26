import { redirect } from "next/navigation";
import DashboardView from "@/components/custom/DashboardView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getTimeEntries, getActiveTimer, TimeEntryWithRelations } from "@/server/data/time-entries";
import { getTags } from "@/server/data/tags";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";

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

  const [projectsData, clientsData, entriesData, activeTimerData, tagsData] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getTimeEntries(10),
    getActiveTimer(),
    getTags(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);
  const projectMap = new Map(projects.map((p: Project) => [p.id, p]));
  const clientMap = new Map(clients.map((c: Client) => [c.id, c]));
  const entries = entriesData.map((entry: TimeEntryWithRelations) => mapEntry(entry, projectMap, clientMap));
  const activeTimer = activeTimerData ? mapEntry(activeTimerData, projectMap, clientMap) : null;
  const tags = tagsData.map((tag: { id: string; name: string; color: string | null; isSystem: boolean }) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isSystem: tag.isSystem,
  }));

  return (
    <DashboardView
      projects={projects}
      clients={clients}
      entries={entries}
      activeTimer={activeTimer}
      tags={tags}
    />
  );
}
