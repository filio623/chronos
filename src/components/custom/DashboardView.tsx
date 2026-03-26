"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BudgetCard from '@/components/custom/BudgetCard';
import TimeEntryRow from '@/components/custom/TimeEntryRow';
import { Project, TimeEntry, Client, Tag } from '@/types';
import { tailwindToHex } from '@/lib/colors';
import { formatElapsedDuration } from '@/components/custom/AppShell';
import { startTimer } from '@/server/actions/time-entries';

interface DashboardViewProps {
  projects: Project[];
  clients: Client[];
  entries: TimeEntry[];
  activeTimer: TimeEntry | null;
  tags: Tag[];
}

export default function DashboardView({
  projects,
  clients,
  entries,
  activeTimer,
  tags,
}: DashboardViewProps) {
  const router = useRouter();

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/projects?highlight=${projectId}`);
  };

  const handleNavigateToClient = (clientId: string) => {
    router.push(`/clients?highlight=${clientId}`);
  };

  const handleRestartTask = async (entry: TimeEntry) => {
    await startTimer(entry.projectId, entry.description);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Budget Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Budget Overview</h2>
          <span className="text-xs font-medium text-slate-400">Real-time DB Data</span>
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
            <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
              No active projects found in database.
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
                  className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tailwindToHex(client.color || 'text-slate-600') }}
                    ></span>
                    <span className="font-medium text-slate-900 text-sm">{client.name}</span>
                  </div>

                  {client.activeInvoiceBlock && (
                    <div className="space-y-2">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-lg font-bold text-slate-900">
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

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {entries.length > 0 ? (
            entries.slice(0, 5).map((entry) => {
              const project = projects.find(p => p.id === entry.projectId);
              return (
                <TimeEntryRow
                  key={entry.id}
                  entry={entry}
                  project={project}
                  availableTags={tags}
                  onRestart={handleRestartTask}
                />
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400">
              No recent activity. Start a timer to get moving!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
