import ReportsView from "@/components/custom/ReportsView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getSummaryMetrics, getDailyActivity, getDailyActivityGrouped, getProjectDistribution } from "@/server/data/reports";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { mapProject, mapClient } from "@/lib/mappers";

export default async function ReportsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 30));

  const reportFilters = {
    projectId: typeof searchParams?.project === 'string' ? searchParams.project : undefined,
    clientId: typeof searchParams?.client === 'string' ? searchParams.client : undefined,
    groupBy: typeof searchParams?.groupBy === 'string' ? searchParams.groupBy as 'project' | 'client' | 'day' : 'project' as const,
    from: typeof searchParams?.from === 'string' ? startOfDay(new Date(searchParams.from)) : startDate,
    to: typeof searchParams?.to === 'string' ? endOfDay(new Date(searchParams.to)) : endDate,
  };

  const [projectsData, clientsData, summaryMetrics, dailyActivity, dailyActivityGrouped, projectDistribution] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getSummaryMetrics(reportFilters.from, reportFilters.to, reportFilters),
    getDailyActivity(reportFilters.from, reportFilters.to, reportFilters),
    getDailyActivityGrouped(reportFilters.from, reportFilters.to, reportFilters),
    getProjectDistribution(reportFilters.from, reportFilters.to, reportFilters),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);

  return (
    <ReportsView
      data={{
        summary: summaryMetrics,
        dailyActivity,
        dailyActivityGrouped,
        projectDistribution,
      }}
      projects={projects.map(p => ({ id: p.id, name: p.name, clientId: p.clientId }))}
      clients={clients.map(c => ({ id: c.id, name: c.name, currency: c.currency }))}
    />
  );
}
