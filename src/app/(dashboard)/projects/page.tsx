import ProjectsList from "@/components/custom/ProjectsList";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData, ClientWithData } from "@/server/data/clients";
import { Project, Client, InvoiceBlockStatus } from "@/types";
import { InvoiceBlock as PrismaInvoiceBlock } from "@prisma/client";

type ProjectWithHours = Awaited<ReturnType<typeof getProjects>>["projects"][number];

const mapProject = (p: ProjectWithHours): Project => ({
  id: p.id,
  name: p.name,
  client: p.client?.name || "No Client",
  clientId: p.clientId,
  color: p.color,
  hoursUsed: p.hoursUsed,
  hoursTotal: p.budgetLimit,
  isFavorite: p.isFavorite,
  isArchived: p.isArchived,
  defaultBillable: p.defaultBillable,
  hourlyRate: p.hourlyRate,
});

const mapInvoiceBlock = (b: PrismaInvoiceBlock & { hoursTracked: number; progressPercent: number }) => ({
  id: b.id,
  clientId: b.clientId,
  hoursTarget: b.hoursTarget,
  hoursCarriedForward: b.hoursCarriedForward,
  startDate: b.startDate.toISOString(),
  endDate: b.endDate ? b.endDate.toISOString() : null,
  status: b.status as InvoiceBlockStatus,
  notes: b.notes ?? undefined,
  hoursTracked: b.hoursTracked,
  progressPercent: b.progressPercent,
});

const mapClient = (c: ClientWithData): Client => ({
  id: c.id,
  name: c.name,
  address: c.address ?? undefined,
  currency: c.currency,
  color: c.color,
  budgetLimit: c.budgetLimit,
  hoursTracked: c.hoursTracked,
  activeInvoiceBlock: c.activeInvoiceBlock ? mapInvoiceBlock(c.activeInvoiceBlock) : null,
  defaultBillable: c.defaultBillable,
  defaultRate: c.defaultRate,
});

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
