import AppShell from "@/components/custom/AppShell";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData } from "@/server/data/clients";
import { getActiveTimer, TimeEntryWithRelations } from "@/server/data/time-entries";
import { Project, Client } from "@/types";
import { mapProject, mapClient, mapEntry } from "@/lib/mappers";

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
