import AppShell from "@/components/custom/AppShell";
import { getProjects } from "@/server/data/projects";
import { getClientsWithData, ClientWithData } from "@/server/data/clients";
import { getActiveTimer, TimeEntryWithRelations } from "@/server/data/time-entries";
import { Project, Client, TimeEntry, InvoiceBlockStatus } from "@/types";
import { InvoiceBlock as PrismaInvoiceBlock } from "@prisma/client";

/**
 * Lightweight mappers for layout-level data (projects, clients, active timer).
 * These are duplicated from the full mappers in page.tsx for now;
 * Phase 2 will extract them into src/lib/mappers.ts.
 */

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

const mapTimerEntry = (
  e: TimeEntryWithRelations,
  projectMap: Map<string, Project>,
  clientMap: Map<string, Client>
): TimeEntry => {
  const pausedSeconds = e.pausedSeconds ?? 0;
  const pausedAt = e.pausedAt ?? null;
  const isPaused = !e.endTime && !!pausedAt;
  const effectiveEnd = e.endTime
    ? e.endTime.getTime()
    : pausedAt
      ? pausedAt.getTime()
      : Date.now();
  const computedSeconds = Math.floor((effectiveEnd - e.startTime.getTime()) / 1000) - pausedSeconds;
  const durationSeconds = e.duration ?? Math.max(0, computedSeconds);
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const entryRateOverride = (e as any).rateOverride ?? null;
  const project = projectMap.get(e.projectId || '');
  const clientId = e.clientId ?? project?.clientId ?? null;
  const client = clientId ? clientMap.get(clientId) : null;

  let effectiveRate: number | null = null;
  let rateSource: 'entry' | 'project' | 'client' | 'none' = 'none';

  if (entryRateOverride !== null && entryRateOverride !== undefined) {
    effectiveRate = entryRateOverride;
    rateSource = 'entry';
  } else if (project?.hourlyRate !== null && project?.hourlyRate !== undefined) {
    effectiveRate = project.hourlyRate;
    rateSource = 'project';
  } else if (client?.defaultRate !== null && client?.defaultRate !== undefined) {
    effectiveRate = client.defaultRate;
    rateSource = 'client';
  }

  return {
    id: e.id,
    description: e.description || "",
    projectId: e.projectId || "",
    clientId: e.clientId ?? null,
    date: e.startTime.toISOString(),
    startTime: e.startTime.toISOString(),
    startTimeISO: e.startTime.toISOString(),
    pausedAtISO: pausedAt ? pausedAt.toISOString() : null,
    pausedSeconds,
    isPaused,
    endTime: e.endTime ? e.endTime.toISOString() : isPaused ? "Paused" : "Running...",
    duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    durationSeconds,
    isBillable: e.isBillable,
    rateOverride: entryRateOverride,
    effectiveRate,
    rateSource,
    currency: client?.currency ?? 'USD',
    tags: e.tags?.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      isSystem: t.isSystem,
    })),
  };
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch shared data needed by AppShell (sidebar + timer bar)
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
    ? mapTimerEntry(activeTimerData, projectMap, clientMap)
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
