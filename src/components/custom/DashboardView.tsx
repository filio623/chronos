"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import BudgetCard from '@/components/custom/BudgetCard';
import TimeEntryRow from '@/components/custom/TimeEntryRow';
import { Project, TimeEntry, Client, Tag } from '@/types';
import { tailwindToHex } from '@/lib/colors';
import { daysToEmpty } from '@/lib/tracking';
import { useTimerSession } from './TimerSessionContext';
import { Button } from '@/components/ui/button';

interface DashboardViewProps {
  projects: Project[];
  clients: Client[];
  entries: TimeEntry[];
  activeTimer: TimeEntry | null;
  tags: Tag[];
  hoursThisWeekByClient?: Record<string, number>;
  weekDaysElapsed?: number;
}

export default function DashboardView({
  projects,
  clients,
  entries,
  tags,
  hoursThisWeekByClient = {},
  weekDaysElapsed = 1,
}: DashboardViewProps) {
  const router = useRouter();
  const { requestStart, openManualEntry } = useTimerSession();

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/projects?highlight=${projectId}`);
  };

  const handleNavigateToClient = (clientId: string) => {
    router.push(`/clients?highlight=${clientId}`);
  };

  const handleRestartTask = async (entry: TimeEntry) => {
    const started = await requestStart(entry.projectId || null, entry.description);
    if (!started) return;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Budget Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Budget Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.length > 0 ? (
            projects.slice(0, 3).map((proj) => (
              <BudgetCard
                key={proj.id}
                project={proj}
                onClick={() => handleNavigateToProject(proj.id)}
              />
            ))
          ) : (
            <div className="col-span-full p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-500 space-y-3">
              <p>No active projects yet.</p>
              <Button type="button" onClick={() => router.push('/projects')}>Create a project</Button>
            </div>
          )}
        </div>
      </section>

      {/* Active Retainers */}
      {clients.filter(c => c.activeInvoiceBlock).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Active Retainers</h2>
            <button
              onClick={() => router.push('/clients')}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              View All Clients
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {clients
              .filter(c => c.activeInvoiceBlock)
              .slice(0, 6)
              .map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleNavigateToClient(client.id)}
                  className="w-full text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tailwindToHex(client.color || 'text-slate-600') }}
                    ></span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{client.name}</span>
                  </div>

                  {client.activeInvoiceBlock && (
                    <div className="space-y-2">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {client.activeInvoiceBlock.hoursTracked.toFixed(1)}h
                          </span>
                          <span className="text-slate-400 text-xs ml-1">
                            / {client.activeInvoiceBlock.hoursTarget.toFixed(1)}h
                          </span>
                        </div>
                        <span className={`text-xs font-medium ${client.activeInvoiceBlock.progressPercent >= 100 ? 'text-rose-600' : client.activeInvoiceBlock.progressPercent >= 80 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {client.activeInvoiceBlock.progressPercent.toFixed(0)}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        {daysToEmpty({
                          hoursTarget: client.activeInvoiceBlock.hoursTarget,
                          hoursTracked: client.activeInvoiceBlock.hoursTracked,
                          hoursThisWeek: hoursThisWeekByClient[client.id] ?? 0,
                          weekDaysElapsed,
                        }).label}
                      </p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            client.activeInvoiceBlock.progressPercent >= 100
                              ? 'bg-rose-500'
                              : client.activeInvoiceBlock.progressPercent >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, client.activeInvoiceBlock.progressPercent)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              ))
            }
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Recent Activity</h2>
          <button
            onClick={() => router.push('/tracker')}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            View All
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {entries.length > 0 ? (
            entries.slice(0, 5).map((entry) => {
              const project = projects.find(p => p.id === entry.projectId);
              return (
                <TimeEntryRow
                  key={entry.id}
                  entry={entry}
                  project={project}
                  projects={projects}
                  availableTags={tags}
                  onRestart={handleRestartTask}
                />
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p>No recent activity.</p>
              <div className="flex justify-center gap-2">
                <Button type="button" onClick={() => requestStart(null, "")}>Start a timer</Button>
                <Button type="button" variant="outline" onClick={openManualEntry}>Log time</Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
