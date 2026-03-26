"use client";

import React, { useState, useEffect, useMemo, useOptimistic, useTransition, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/custom/Sidebar';
import TimerBar from '@/components/custom/TimerBar';
import { Project, TimeEntry, Client } from '@/types';
import { startTimer, stopTimer, pauseTimer, resumeTimer } from '@/server/actions/time-entries';

interface AppShellProps {
  initialProjects: Project[];
  initialClients: Client[];
  activeTimer: TimeEntry | null;
  children: React.ReactNode;
}

// Helper to calculate elapsed seconds from a timer's start time
function calculateElapsedSeconds(timer: TimeEntry | null): number {
  if (!timer) return 0;
  const startStr = timer.startTimeISO || timer.startTime;
  const start = new Date(startStr).getTime();
  if (isNaN(start)) return 0;
  const pausedSeconds = timer.pausedSeconds ?? 0;
  const pausedAtStr = timer.pausedAtISO || null;
  if (pausedAtStr) {
    const pausedAtMs = new Date(pausedAtStr).getTime();
    if (!isNaN(pausedAtMs)) {
      return Math.max(0, Math.floor((pausedAtMs - start) / 1000) - pausedSeconds);
    }
  }
  const endMs = Date.now();
  return Math.max(0, Math.floor((endMs - start) / 1000) - pausedSeconds);
}

export function formatElapsedDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTitleTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
      document.title = `${formatTitleTime(elapsedSeconds)} - Chronos`;
    } else if (isPaused) {
      document.title = `Paused • ${formatTitleTime(elapsedSeconds)} - Chronos`;
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
    setElapsedSeconds(calculateElapsedSeconds(activeTimer));
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
          {children}
          <div className="h-10"></div>
        </div>
      </main>
    </div>
  );
}
