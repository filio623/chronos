"use client";

import React, { useState, useEffect, useOptimistic, useTransition } from 'react';
import Sidebar from '@/components/custom/Sidebar';
import TimerBar from '@/components/custom/TimerBar';
import BudgetCard from '@/components/custom/BudgetCard';
import TrackerList from '@/components/custom/TrackerList';
import ProjectsList from '@/components/custom/ProjectsList';
import ClientsList from '@/components/custom/ClientsList';
import ReportsView from '@/components/custom/ReportsView';
import TimesheetView from '@/components/custom/TimesheetView';
import TimeEntryRow from '@/components/custom/TimeEntryRow';
import { Project, TimeEntry, Client } from '@/types';
import { startTimer, stopTimer } from '@/server/actions/time-entries';

interface MainDashboardProps {
  initialProjects: Project[];
  projectsCount?: number;
  initialClients: Client[];
  initialEntries: TimeEntry[];
  activeTimer: TimeEntry | null;
  reportData: {
    summary: any;
    dailyActivity: any[];
    projectDistribution: any[];
  };
}

export default function MainDashboard({
  initialProjects,
  projectsCount,
  initialClients,
  initialEntries,
  activeTimer,
  reportData
}: MainDashboardProps) {
  const [currentView, setCurrentView] = useState('timesheet');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic timer state for instant UI feedback
  const [optimisticTimerState, setOptimisticTimerState] = useOptimistic(
    { isRunning: !!activeTimer, timerId: activeTimer?.id || null },
    (state, action: { type: 'start' | 'stop' }) => {
      if (action.type === 'start') {
        return { isRunning: true, timerId: 'optimistic-temp' };
      }
      return { isRunning: false, timerId: null };
    }
  );

  const isRunning = optimisticTimerState.isRunning;

  // Initialize from active timer
  useEffect(() => {
    if (activeTimer) {
      const proj = initialProjects.find(p => p.id === activeTimer.projectId) || null;
      setActiveProject(proj);

      // Calculate elapsed time from start
      const start = new Date(activeTimer.startTime).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    } else {
      setElapsedSeconds(0);
      setActiveProject(null);
    }
  }, [activeTimer, initialProjects]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

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
            activeProject={activeProject} 
            isRunning={isRunning} 
            onStart={handleStartTimer}
            onStop={handleStopTimer}
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

            {currentView === 'timesheet' && <TimesheetView projects={initialProjects} entries={initialEntries} />}

            {currentView === 'tracker' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Time Entries</h2>
                  </div>
                  <TrackerList 
                      entries={initialEntries}
                      projects={initialProjects}
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

            {currentView === 'clients' && <ClientsList clients={initialClients} />}

            {currentView === 'reports' && <ReportsView data={reportData} />}

            <div className="h-10"></div>
        </div>
      </main>

    </div>
  );
}