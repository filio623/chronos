"use client";

import React, { useState, useEffect, useMemo, useOptimistic, useTransition, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/custom/Sidebar';
import TimerBar from '@/components/custom/TimerBar';
import { Project, TimeEntry, Client } from '@/types';
import { startTimer, stopTimer, pauseTimer, resumeTimer } from '@/server/actions/time-entries';
import { elapsed as elapsedSecondsForTimer, TimerCalculator, type TimerLike } from '@/lib/timer-calculator';
import { formatDuration, formatBrowserTitle } from '@/lib/time';

interface AppShellProps {
  initialProjects: Project[];
  initialClients: Client[];
  activeTimer: TimeEntry | null;
  children: React.ReactNode;
}

function toTimerLike(timer: TimeEntry): TimerLike {
  return {
    startTime: timer.startTimeISO || timer.startTime,
    endTime: null,
    pausedAt: timer.pausedAtISO ?? null,
    pausedSeconds: timer.pausedSeconds ?? 0,
  };
}

function calculateElapsedSeconds(timer: TimeEntry | null): number {
  if (!timer) return 0;
  return elapsedSecondsForTimer(toTimerLike(timer));
}

export const formatElapsedDuration = formatDuration;

// Map pathname to view name for sidebar highlighting
function pathnameToView(pathname: string): string {
  if (pathname.startsWith('/timesheet')) return 'timesheet';
  if (pathname.startsWith('/tracker')) return 'tracker';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/clients')) return 'clients';
  if (pathname.startsWith('/reports')) return 'reports';
  return 'dashboard';
}

export default function AppShell({
  initialProjects,
  initialClients,
  activeTimer,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentView = pathnameToView(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigateTo = useCallback((view: string) => {
    const path = view === 'dashboard' ? '/' : `/${view}`;
    router.push(path);
  }, [router]);

  const [elapsedSeconds, setElapsedSeconds] = useState(() => calculateElapsedSeconds(activeTimer));
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const lastTimerIdRef = useRef<string | null>(activeTimer?.id || null);
  const [, startTransition] = useTransition();

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

      if (lastTimerIdRef.current !== activeTimer.id) {
        lastTimerIdRef.current = activeTimer.id;
        const startStr = activeTimer.startTimeISO || activeTimer.startTime;
        const start = new Date(startStr).getTime();
        if (!isNaN(start)) {
          setElapsedSeconds(calculateElapsedSeconds(activeTimer));
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

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds(calculateElapsedSeconds(activeTimer));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  // Browser tab title effect
  useEffect(() => {
    if (isRunning) {
      document.title = `${formatBrowserTitle(elapsedSeconds)} - Chronos`;
    } else if (isPaused) {
      document.title = `Paused • ${formatBrowserTitle(elapsedSeconds)} - Chronos`;
    } else {
      document.title = 'Chronos';
    }
  }, [isRunning, isPaused, elapsedSeconds]);

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
    setElapsedSeconds(TimerCalculator.elapsedAt(toTimerLike(activeTimer), new Date()));
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

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/projects?highlight=${projectId}`);
  };

  const handleNavigateToClient = (clientId: string) => {
    router.push(`/clients?highlight=${clientId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar
        currentView={currentView}
        onViewChange={navigateTo}
        projects={initialProjects}
        onRetainerClick={handleNavigateToProject}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      <main className="flex-1 md:ml-[250px] min-w-0 flex flex-col h-screen">
        <div className="flex items-center">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-3 text-slate-500 hover:text-slate-900"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
          {children}
          <div className="h-10"></div>
        </div>
      </main>
    </div>
  );
}
