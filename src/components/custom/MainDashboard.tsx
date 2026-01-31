"use client";

import React, { useState, useEffect, useOptimistic, useTransition, useRef } from 'react';
import Sidebar from '@/components/custom/Sidebar';
import TimerBar from '@/components/custom/TimerBar';
import BudgetCard from '@/components/custom/BudgetCard';
import TrackerList from '@/components/custom/TrackerList';
import ProjectsList from '@/components/custom/ProjectsList';
import ClientsList from '@/components/custom/ClientsList';
import ReportsView from '@/components/custom/ReportsView';
import TimesheetView from '@/components/custom/TimesheetView';
import TimeEntryRow from '@/components/custom/TimeEntryRow';
import { Project, TimeEntry, Client, InvoiceBlock, Tag } from '@/types';
import { tailwindToHex } from '@/lib/colors';
import { startTimer, stopTimer, pauseTimer, resumeTimer } from '@/server/actions/time-entries';

interface MainDashboardProps {
  initialProjects: Project[];
  projectsCount?: number;
  initialClients: Client[];
  initialEntries: TimeEntry[];
  initialTags: Tag[];
  activeTimer: TimeEntry | null;
  invoiceBlockHistory?: Record<string, InvoiceBlock[]>;
  reportData: {
    summary: any;
    dailyActivity: any[];
    dailyActivityGrouped: any[];
    projectDistribution: any[];
  };
}

// Helper to calculate elapsed seconds from a timer's start time
function calculateElapsedSeconds(timer: TimeEntry | null, isPaused: boolean): number {
  if (!timer) return 0;
  const startStr = timer.startTimeISO || timer.startTime;
  const start = new Date(startStr).getTime();
  if (isNaN(start)) return 0;
  const pausedSeconds = timer.pausedSeconds ?? 0;
  const pausedAtStr = timer.pausedAtISO || null;
  const endMs = isPaused && pausedAtStr ? new Date(pausedAtStr).getTime() : Date.now();
  if (pausedAtStr && isNaN(endMs)) return Math.max(0, Math.floor((Date.now() - start) / 1000) - pausedSeconds);
  return Math.max(0, Math.floor((endMs - start) / 1000) - pausedSeconds);
}

export default function MainDashboard({
  initialProjects,
  projectsCount,
  initialClients,
  initialEntries,
  initialTags,
  activeTimer,
  invoiceBlockHistory = {},
  reportData
}: MainDashboardProps) {
  const [currentView, setCurrentView] = useState('dashboard');
  // Initialize elapsed seconds from activeTimer immediately to avoid race condition
  const [elapsedSeconds, setElapsedSeconds] = useState(() => calculateElapsedSeconds(activeTimer, !!activeTimer?.isPaused));
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const lastTimerIdRef = useRef<string | null>(activeTimer?.id || null);
  const [isPending, startTransition] = useTransition();

  // Optimistic timer state for instant UI feedback
  const [optimisticTimerState, setOptimisticTimerState] = useOptimistic(
    {
      status: activeTimer ? (activeTimer.pausedAtISO ? 'paused' : 'running') : 'stopped',
      timerId: activeTimer?.id || null
    },
    (state, action: { type: 'start' | 'stop' | 'pause' | 'resume' }) => {
      if (action.type === 'start') {
        return { status: 'running', timerId: 'optimistic-temp' };
      }
      if (action.type === 'pause') {
        return { status: 'paused', timerId: state.timerId };
      }
      if (action.type === 'resume') {
        return { status: 'running', timerId: state.timerId };
      }
      return { status: 'stopped', timerId: null };
    }
  );

  const isRunning = optimisticTimerState.status === 'running';
  const isPaused = optimisticTimerState.status === 'paused';
  const isActive = optimisticTimerState.status !== 'stopped';

  // Initialize from active timer - only recalculate when timer ID changes
  useEffect(() => {
    if (activeTimer) {
      const proj = initialProjects.find(p => p.id === activeTimer.projectId) || null;
      setActiveProject(proj);

      // Only recalculate elapsed time if this is a different timer than before
      // This prevents the timer display from resetting when the page revalidates
      if (lastTimerIdRef.current !== activeTimer.id) {
        lastTimerIdRef.current = activeTimer.id;

        // Calculate elapsed time from start
        // Prefer startTimeISO if available (added to types/mappers)
        // Otherwise try parsing startTime, but it might be formatted "HH:MM A" which is invalid
        const startStr = activeTimer.startTimeISO || activeTimer.startTime;
        const start = new Date(startStr).getTime();
        const now = Date.now();

        // Safety check for NaN
        if (!isNaN(start)) {
          setElapsedSeconds(calculateElapsedSeconds(activeTimer, isPaused));
        } else {
          console.error("Invalid start time for active timer:", startStr);
          setElapsedSeconds(0);
        }
      }
    } else {
      lastTimerIdRef.current = null;
      setElapsedSeconds(0);
      setActiveProject(null);
    }
  }, [activeTimer, initialProjects]);

  // Timer Effect - recalculate from actual start time on each tick to prevent drift
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds(calculateElapsedSeconds(activeTimer, isPaused));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  // Browser tab title effect - show elapsed time when timer is running
  useEffect(() => {
    if (isRunning && elapsedSeconds > 0) {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      document.title = `${timeStr} - Chronos`;
    } else if (isPaused && elapsedSeconds > 0) {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      document.title = `Paused • ${timeStr} - Chronos`;
    } else {
      document.title = 'Chronos';
    }
  }, [isRunning, isPaused, elapsedSeconds]);

  const handleRestartTask = async (entry: TimeEntry) => {
    const proj = initialProjects.find(p => p.id === entry.projectId) || null;
    setActiveProject(proj);
    setElapsedSeconds(0);

    startTransition(async () => {
      setOptimisticTimerState({ type: 'start' });
      await startTimer(entry.projectId, entry.description);
    });
  };

  const handleStartTimer = async (projectId: string | null, description: string) => {
    const proj = projectId ? initialProjects.find(p => p.id === projectId) || null : null;
    setActiveProject(proj);
    setElapsedSeconds(0);

    startTransition(async () => {
      setOptimisticTimerState({ type: 'start' });
      await startTimer(projectId, description);
    });
  };

  const handleStopTimer = async () => {
    startTransition(async () => {
      setOptimisticTimerState({ type: 'stop' });
      if (activeTimer) {
        await stopTimer(activeTimer.id);
      }
    });
  };

  const handlePauseTimer = async () => {
    if (!activeTimer) return;
        setElapsedSeconds(calculateElapsedSeconds(activeTimer, isPaused));
    startTransition(async () => {
      setOptimisticTimerState({ type: 'pause' });
      await pauseTimer(activeTimer.id);
    });
  };

  const handleResumeTimer = async () => {
    if (!activeTimer) return;
    startTransition(async () => {
      setOptimisticTimerState({ type: 'resume' });
      await resumeTimer(activeTimer.id);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        projects={initialProjects}
      />

      <main className="flex-1 ml-[250px] min-w-0 flex flex-col h-screen">
        
        <TimerBar
            projects={initialProjects}
            clients={initialClients}
            activeProject={activeProject}
            isActive={isActive}
            isPaused={isPaused}
            onStart={handleStartTimer}
            onStop={handleStopTimer}
            onPause={handlePauseTimer}
            onResume={handleResumeTimer}
            elapsedSeconds={elapsedSeconds}
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scroll-smooth">
            
            {currentView === 'dashboard' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Budget Overview */}
                  <section>
                      <div className="flex items-center justify-between mb-4">
                          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Budget Overview</h2>
                          <span className="text-xs font-medium text-slate-400">Real-time DB Data</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {initialProjects.length > 0 ? (
                            initialProjects.slice(0, 3).map((proj) => (
                                <BudgetCard key={proj.id} project={proj} />
                            ))
                          ) : (
                            <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                              No active projects found in database.
                            </div>
                          )}
                      </div>
                  </section>

                  {/* Active Retainers */}
                  {initialClients.filter(c => c.activeInvoiceBlock).length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Active Retainers</h2>
                        <button
                          onClick={() => setCurrentView('clients')}
                          className="text-xs font-medium text-indigo-600 hover:underline"
                        >
                          View All Clients
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {initialClients
                          .filter(c => c.activeInvoiceBlock)
                          .slice(0, 6)
                          .map((client) => (
                            <div
                              key={client.id}
                              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3"
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
                                        / {(client.activeInvoiceBlock.hoursTarget + client.activeInvoiceBlock.hoursCarriedForward).toFixed(1)}h
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
                            </div>
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
                            onClick={() => setCurrentView('tracker')}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                          >
                            View All
                          </button>
                      </div>
                      
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          {initialEntries.length > 0 ? (
                            initialEntries.slice(0, 5).map((entry) => {
                              const project = initialProjects.find(p => p.id === entry.projectId);
                              return (
                                <TimeEntryRow 
                                  key={entry.id} 
                                  entry={entry} 
                                  project={project}
                                  availableTags={initialTags}
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
            )}

            {currentView === 'timesheet' && (
              <TimesheetView
                projects={initialProjects}
                clients={initialClients}
                entries={initialEntries}
              />
            )}

            {currentView === 'tracker' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Time Entries</h2>
                  </div>
                  <TrackerList 
                      entries={initialEntries}
                      projects={initialProjects}
                      clients={initialClients}
                      tags={initialTags}
                      onRestart={handleRestartTask}
                  />
              </section>
            )}

            {currentView === 'projects' && (
              <ProjectsList
                projects={initialProjects}
                clients={initialClients}
                totalCount={projectsCount}
              />
            )}

            {currentView === 'clients' && <ClientsList clients={initialClients} invoiceBlockHistory={invoiceBlockHistory} />}

            {currentView === 'reports' && (
              <ReportsView
                data={reportData}
                projects={initialProjects.map(p => ({ id: p.id, name: p.name, clientId: p.clientId }))}
                clients={initialClients.map(c => ({ id: c.id, name: c.name }))}
              />
            )}

            <div className="h-10"></div>
        </div>
      </main>

    </div>
  );
}
