import ProjectsList from "@/components/custom/ProjectsList";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { mapProject, mapClient } from "@/lib/mappers";

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

  const [projectsData, clientsData] = await Promise.all([
    getProjects(projectFilters),
    getClientsWithData(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);

  return (
    <ProjectsList
      projects={projects}
      clients={clients}
      totalCount={projectsData.totalCount}
      highlightedProjectId={highlightedProjectId}
    />
  );
}
