import ReportsView from "@/components/custom/ReportsView";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getSummaryMetrics, getDailyActivity, getDailyActivityGrouped, getProjectDistribution } from "@/server/data/reports";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { mapProject, mapClient } from "@/lib/mappers";
import { getTrackingPrefs } from "@/lib/prefs";
import { roundSeconds } from "@/lib/tracking";

export default async function ReportsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const prefs = await getTrackingPrefs();

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
  const clients = clientsData.map((client) => mapClient(client, prefs.rounding));

  const roundedSummary = {
    ...summaryMetrics,
    totalSeconds: roundSeconds(summaryMetrics.totalSeconds, prefs.rounding),
    billableSeconds: roundSeconds(summaryMetrics.billableSeconds, prefs.rounding),
    totalAmount: summaryMetrics.billableSeconds
      ? summaryMetrics.totalAmount * (roundSeconds(summaryMetrics.billableSeconds, prefs.rounding) / summaryMetrics.billableSeconds)
      : summaryMetrics.totalAmount,
  };
  const roundedDaily = dailyActivity.map((day) => ({
    ...day,
    hours: roundSeconds(day.hours * 3600, prefs.rounding) / 3600,
  }));
  const roundedGrouped = dailyActivityGrouped.map((row) => ({
    ...row,
    hours: roundSeconds(Number(row.hours) * 3600, prefs.rounding) / 3600,
  }));
  const roundedDistribution = projectDistribution.map((row) => ({
    ...row,
    hours: roundSeconds(row.hours * 3600, prefs.rounding) / 3600,
  }));

  return (
    <ReportsView
      data={{
        summary: roundedSummary,
        dailyActivity: roundedDaily,
        dailyActivityGrouped: roundedGrouped,
        projectDistribution: roundedDistribution,
      }}
      projects={projects.map(p => ({ id: p.id, name: p.name, clientId: p.clientId }))}
      clients={clients.map(c => ({ id: c.id, name: c.name, currency: c.currency }))}
      weekStartsOn={prefs.weekStartsOn}
    />
  );
}
