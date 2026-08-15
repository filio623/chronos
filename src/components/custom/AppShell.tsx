"use client";

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/custom/Sidebar';
import TimerBar from '@/components/custom/TimerBar';
import { Project, TimeEntry, Client } from '@/types';
import { startTimer, stopTimer, pauseTimer, resumeTimer } from '@/server/actions/time-entries';
import { elapsed as elapsedSecondsForTimer, TimerCalculator, type TimerLike } from '@/lib/timer-calculator';
import {
  formatDuration,
  browserTitle,
  timerStatusFromEntry,
  resolveTimerChromeStatus,
  shouldClearTimerIntent,
  type TimerChromeStatus,
} from '@/lib/time';

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

export const formatElapsedDuration = formatDuration;

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

  const serverStatus = timerStatusFromEntry(activeTimer);
  const [intent, setIntent] = useState<TimerChromeStatus | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [frozenElapsed, setFrozenElapsed] = useState<number | null>(null);
  const [resumeStartedAt, setResumeStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [, startTransition] = useTransition();

  if (shouldClearTimerIntent(serverStatus, intent)) {
    setIntent(null);
  }

  const status = resolveTimerChromeStatus(serverStatus, intent);
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isActive = status !== 'stopped';

  const sessionProjectId = activeTimer?.projectId || pendingProjectId;
  const activeProject = sessionProjectId
    ? initialProjects.find(p => p.id === sessionProjectId) || null
    : null;

  const elapsedSeconds = (() => {
    if (isPaused) {
      return frozenElapsed ?? (activeTimer ? elapsedSecondsForTimer(toTimerLike(activeTimer)) : 0);
    }
    // After resume, keep the frozen pause value until the server clears pausedAt.
    // elapsedAt() ignores an open pause window and would jump forward.
    if (isRunning && frozenElapsed != null && resumeStartedAt != null && serverStatus !== "running") {
      return frozenElapsed + Math.max(0, Math.floor((nowMs - resumeStartedAt) / 1000));
    }
    if (activeTimer) {
      return TimerCalculator.elapsedAt(toTimerLike(activeTimer), new Date(nowMs));
    }
    return 0;
  })();

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    const wanted = () => browserTitle(status, elapsedSeconds);
    document.title = wanted();

    // Next.js metadata (`title: "Chronos"`) rewrites <title> after
    // revalidatePath. Re-apply so pause/resume titles survive the RSC refresh.
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => {
      const next = wanted();
      if (document.title !== next) document.title = next;
    });
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [status, elapsedSeconds, activeTimer?.id, activeTimer?.pausedAtISO]);

  const handleStartTimer = async (projectId: string | null, description: string) => {
    setPendingProjectId(projectId);
    setFrozenElapsed(null);
    setResumeStartedAt(null);
    setIntent('running');
    setNowMs(Date.now());
    startTransition(async () => {
      await startTimer(projectId, description);
    });
  };

  const handleStopTimer = async () => {
    setIntent('stopped');
    setFrozenElapsed(null);
    setResumeStartedAt(null);
    setPendingProjectId(null);
    startTransition(async () => {
      if (activeTimer) {
        await stopTimer(activeTimer.id);
      }
    });
  };

  const handlePauseTimer = async () => {
    const source = activeTimer;
    const frozen = source
      ? TimerCalculator.elapsedAt(toTimerLike(source), new Date())
      : elapsedSeconds;
    setFrozenElapsed(frozen);
    setResumeStartedAt(null);
    setIntent('paused');
    startTransition(async () => {
      if (source) {
        await pauseTimer(source.id);
      }
    });
  };

  const handleResumeTimer = async () => {
    setIntent('running');
    setResumeStartedAt(Date.now());
    setNowMs(Date.now());
    startTransition(async () => {
      if (activeTimer) {
        await resumeTimer(activeTimer.id);
      }
    });
  };

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/projects?highlight=${projectId}`);
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
