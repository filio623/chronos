import AppShell from "@/components/custom/AppShell";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getActiveTimer } from "@/server/data/time-entries";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projectsData, clientsData, activeTimerData] = await Promise.all([
    getProjects({ status: 'active', pageSize: 50 }),
    getClientsWithData(),
    getActiveTimer(),
  ]);

  const projects = projectsData.projects.map(mapProject);
  const clients = clientsData.map(mapClient);
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const activeTimer = activeTimerData
    ? mapEntry(activeTimerData, projectMap, clientMap)
    : null;

  return (
    <AppShell
      initialProjects={projects}
      initialClients={clients}
      activeTimer={activeTimer}
    >
      {children}
    </AppShell>
  );
}
