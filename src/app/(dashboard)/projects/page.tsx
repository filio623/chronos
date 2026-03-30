import ProjectsList from "@/components/custom/ProjectsList";
import { getProjects, type ProjectWithHours } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getActiveTimer } from "@/server/data/time-entries";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";

export default async function ProjectsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const projectFilters = {
    search: typeof searchParams?.search === 'string' ? searchParams.search : undefined,
    clientId: typeof searchParams?.client === 'string' ? searchParams.client : undefined,
    status: typeof searchParams?.status === 'string' ? (searchParams.status as 'active' | 'archived') : 'active' as const,
    sortBy: typeof searchParams?.sortBy === 'string' ? (searchParams.sortBy as 'name' | 'client' | 'hoursUsed' | 'updatedAt') : 'updatedAt' as const,
    sortOrder: typeof searchParams?.sortOrder === 'string' ? (searchParams.sortOrder as 'asc' | 'desc') : 'desc' as const,
    page: typeof searchParams?.page === 'string' ? parseInt(searchParams.page, 10) : 1,
    pageSize: 10,
  };

  const highlightedProjectId = typeof searchParams?.highlight === 'string' ? searchParams.highlight : null;

  const [projectsData, clientsData, activeTimerData] = await Promise.all([
    getProjects(projectFilters),
    getClientsWithData(),
    getActiveTimer(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const timerProject = activeTimerData?.project;
  if (timerProject && !projectMap.has(timerProject.id)) {
    const timerProjectWithHours: ProjectWithHours = {
      ...timerProject,
      client: timerProject.client
        ? { id: timerProject.client.id, name: timerProject.client.name }
        : null,
      hoursUsed: 0,
    };

    projectMap.set(timerProject.id, mapProject(timerProjectWithHours));
  }

  const activeTimer = activeTimerData
    ? mapEntry(activeTimerData, projectMap, clientMap)
    : null;

  return (
    <ProjectsList
      projects={projects}
      clients={clients}
      activeTimer={activeTimer}
      totalCount={projectsData.totalCount}
      highlightedProjectId={highlightedProjectId}
    />
  );
}
