"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/custom/Sidebar";
import TimerBar from "@/components/custom/TimerBar";
import { Project, TimeEntry, Client } from "@/types";
import { startTimer, stopTimer, pauseTimer, resumeTimer, updateTimeEntry } from "@/server/actions/time-entries";
import { elapsed as elapsedSecondsForTimer, TimerCalculator, timeEntryToTimerLike } from "@/lib/timer-calculator";
import {
  formatDuration,
  timerStatusFromEntry,
  resolveTimerChromeStatus,
  shouldClearTimerIntent,
  resolveActiveSession,
  type TimerChromeStatus,
  type WeekStartsOn,
} from "@/lib/time";
import { shortcutShouldIgnore, type RecentTask, type RoundingRule } from "@/lib/tracking";
import { TimerSessionProvider } from "./TimerSessionContext";
import { BrowserTitle, LiveChromeDuration, LivePeriodTotals } from "./LiveElapsed";
import { ManualTimeEntryForm } from "./ManualTimeEntryForm";
import { TrackingPrefs } from "./TrackingPrefs";
import { ThemeToggle } from "./ThemeToggle";
import { RetainerWatch } from "./RetainerWatch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppShellProps {
  initialProjects: Project[];
  initialClients: Client[];
  activeTimer: TimeEntry | null;
  recents?: RecentTask[];
  weekEntries?: TimeEntry[];
  todayKey?: string;
  weekStartsOn?: WeekStartsOn;
  rounding?: RoundingRule;
  children: React.ReactNode;
}

export const formatElapsedDuration = formatDuration;

function pathnameToView(pathname: string): string {
  if (pathname.startsWith("/timesheet")) return "timesheet";
  if (pathname.startsWith("/tracker")) return "tracker";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/reports")) return "reports";
  return "dashboard";
}

export default function AppShell({
  initialProjects,
  initialClients,
  activeTimer,
  recents = [],
  weekEntries = [],
  todayKey,
  weekStartsOn = 0,
  rounding = { incrementMinutes: 0, mode: "none" },
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const currentView = pathnameToView(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const serverStatus = timerStatusFromEntry(activeTimer);
  const [intent, setIntent] = useState<TimerChromeStatus | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingTimerId, setPendingTimerId] = useState<string | null>(null);
  const [pendingDescription, setPendingDescription] = useState("");
  const [pendingBillable, setPendingBillable] = useState<boolean | null>(null);
  const [frozenElapsed, setFrozenElapsed] = useState<number | null>(null);
  const [resumeStartedAt, setResumeStartedAt] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [queuedStart, setQueuedStart] = useState<{ projectId: string | null; description: string; isBillable?: boolean } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [, startTransition] = useTransition();
  const stopAfterStartRef = useRef(false);
  const pauseAfterStartRef = useRef(false);
  const idleStartRef = useRef<(() => Promise<void>) | null>(null);
  const registerIdleStart = useCallback((fn: (() => Promise<void>) | null) => {
    idleStartRef.current = fn;
  }, []);

  if (shouldClearTimerIntent(serverStatus, intent)) {
    setIntent(null);
  }

  const status = resolveTimerChromeStatus(serverStatus, intent);
  const isPaused = status === "paused";
  const isActive = status !== "stopped";

  const session = resolveActiveSession({
    activeTimer: activeTimer
      ? { id: activeTimer.id, description: activeTimer.description, projectId: activeTimer.projectId }
      : null,
    pendingTimerId,
    pendingDescription,
    pendingProjectId,
    intent,
    isStarting,
  });
  const sessionTimerId = session.sessionTimerId;
  const description = session.description;
  const sessionProjectId = session.projectId;
  const activeProject = sessionProjectId
    ? initialProjects.find((p) => p.id === sessionProjectId) || null
    : null;
  const clientName = activeProject?.client && activeProject.client !== "No Client"
    ? activeProject.client
    : null;
  const sessionEntry = activeTimer && activeTimer.id === sessionTimerId ? activeTimer : null;
  const sessionBillable = pendingBillable ?? sessionEntry?.isBillable ?? true;
  const runningClientId = activeProject?.clientId ?? sessionEntry?.clientId ?? null;

  const beginStart = async (projectId: string | null, taskDescription: string, isBillable?: boolean) => {
    stopAfterStartRef.current = false;
    pauseAfterStartRef.current = false;
    setPendingProjectId(projectId);
    setPendingDescription(taskDescription);
    setPendingTimerId(null);
    setPendingBillable(isBillable ?? null);
    setFrozenElapsed(0);
    setResumeStartedAt(Date.now());
    setIntent("running");
    setIsStarting(true);
    const result = await startTimer(projectId, taskDescription, isBillable === undefined ? undefined : { isBillable });
    setIsStarting(false);
    if (!result.success) {
      toast.error(result.error || "Failed to start timer");
      setIntent(null);
      setPendingTimerId(null);
      return false;
    }
    const createdId = result.data?.id ?? null;
    if (createdId) setPendingTimerId(createdId);
    if (createdId && stopAfterStartRef.current) {
      stopAfterStartRef.current = false;
      setIntent("stopped");
      const stopped = await stopTimer(createdId);
      if (!stopped.success) toast.error(stopped.error || "Failed to stop timer");
      setPendingTimerId(null);
      setPendingDescription("");
      setPendingProjectId(null);
      setPendingBillable(null);
      return true;
    }
    if (createdId && pauseAfterStartRef.current) {
      pauseAfterStartRef.current = false;
      setIntent("paused");
      const paused = await pauseTimer(createdId);
      if (!paused.success) toast.error(paused.error || "Failed to pause timer");
    }
    return true;
  };

  const requestStart = async (projectId: string | null, taskDescription: string, options?: { isBillable?: boolean }) => {
    if (isActive) {
      setQueuedStart({ projectId, description: taskDescription, isBillable: options?.isBillable });
      setReplaceOpen(true);
      return false;
    }
    return beginStart(projectId, taskDescription, options?.isBillable);
  };

  const handleStopTimer = async () => {
    const id = sessionTimerId;
    setIntent("stopped");
    setFrozenElapsed(null);
    setResumeStartedAt(null);
    if (!id) {
      stopAfterStartRef.current = true;
      return;
    }
    startTransition(async () => {
      const result = await stopTimer(id);
      if (!result.success) {
        toast.error(result.error || "Failed to stop timer");
        return;
      }
      setPendingProjectId(null);
      setPendingTimerId(null);
      setPendingDescription("");
      setPendingBillable(null);
    });
  };

  const handlePauseTimer = async () => {
    const id = sessionTimerId;
    const source = sessionEntry;
    const frozen = source
      ? TimerCalculator.elapsedAt(timeEntryToTimerLike(source), new Date())
      : elapsedSecondsForTimer(timeEntryToTimerLike(source || {
          startTime: new Date().toISOString(),
          pausedAtISO: null,
          pausedSeconds: 0,
          endTime: "Running...",
        }));
    setFrozenElapsed(frozen);
    setResumeStartedAt(null);
    setIntent("paused");
    if (!id) {
      pauseAfterStartRef.current = true;
      return;
    }
    startTransition(async () => {
      const result = await pauseTimer(id);
      if (!result.success) toast.error(result.error || "Failed to pause timer");
    });
  };

  const handleResumeTimer = async () => {
    const id = sessionTimerId;
    setIntent("running");
    setResumeStartedAt(Date.now());
    if (!id) return;
    startTransition(async () => {
      const result = await resumeTimer(id);
      if (!result.success) toast.error(result.error || "Failed to resume timer");
    });
  };

  const handleRetarget = async (patch: { description?: string; projectId?: string | null; isBillable?: boolean }) => {
    if (patch.description !== undefined) setPendingDescription(patch.description);
    if (patch.projectId !== undefined) setPendingProjectId(patch.projectId);
    if (patch.isBillable !== undefined) setPendingBillable(patch.isBillable);
    if (!sessionTimerId) return;
    const result = await updateTimeEntry(sessionTimerId, patch);
    if (!result.success) toast.error(result.error || "Failed to update timer");
  };

  const retainers = initialClients
    .filter((client) => client.activeInvoiceBlock)
    .map((client) => ({ id: client.id, name: client.name, color: client.color }));

  const confirmReplace = async () => {
    const queued = queuedStart;
    setReplaceOpen(false);
    setQueuedStart(null);
    if (!queued) return;
    const idToStop = sessionTimerId ?? activeTimer?.id;
    if (idToStop) {
      const stopped = await stopTimer(idToStop);
      if (!stopped.success) {
        toast.error(stopped.error || "Failed to stop the current timer");
        return;
      }
    }
    await beginStart(queued.projectId, queued.description, queued.isBillable);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (shortcutShouldIgnore(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (key === "s") {
        event.preventDefault();
        if (isActive) {
          void handleStopTimer();
        } else {
          void idleStartRef.current?.();
        }
        return;
      }
      if (key === "p") {
        event.preventDefault();
        if (!isActive) return;
        if (isPaused) void handleResumeTimer();
        else void handlePauseTimer();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        setManualOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <TimerSessionProvider
      value={{
        status,
        serverStatus,
        timerId: sessionTimerId,
        description,
        clientName,
        frozenElapsed,
        resumeStartedAt,
        isStarting,
        isBillable: sessionBillable,
        weekStartsOn,
        rounding,
        requestStart,
        openManualEntry: () => setManualOpen(true),
      }}
    >
      <BrowserTitle
        status={status}
        serverStatus={serverStatus}
        entry={sessionEntry}
        frozenElapsed={frozenElapsed}
        resumeStartedAt={resumeStartedAt}
      />
      <RetainerWatch
        clients={initialClients}
        runningClientId={runningClientId}
        runningEntry={sessionEntry}
      />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100">
        <Sidebar
          currentView={currentView}
          retainers={retainers}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />

        <main className="flex-1 md:ml-[250px] min-w-0 flex flex-col h-screen">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-3 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="flex-1">
              <TimerBar
                projects={initialProjects}
                clients={initialClients}
                activeProject={activeProject}
                description={description}
                clientName={clientName}
                isActive={isActive}
                isPaused={isPaused}
                isStarting={isStarting}
                isBillable={sessionBillable}
                recents={recents}
                onStart={requestStart}
                onStop={handleStopTimer}
                onPause={handlePauseTimer}
                onResume={handleResumeTimer}
                onRetarget={handleRetarget}
                onRegisterIdleStart={registerIdleStart}
                elapsed={
                  <LiveChromeDuration
                    status={status}
                    serverStatus={serverStatus}
                    entry={sessionEntry}
                    frozenElapsed={frozenElapsed}
                    resumeStartedAt={resumeStartedAt}
                    className="font-mono text-2xl font-medium text-indigo-600 tracking-tight"
                  />
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
            <LivePeriodTotals
              weekEntries={weekEntries}
              todayKey={todayKey ?? ""}
              className="text-xs text-slate-600 dark:text-slate-400"
            />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <TrackingPrefs weekStartsOn={weekStartsOn} rounding={rounding} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
            {children}
            <div className="h-10"></div>
          </div>
        </main>
      </div>

      <AlertDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the running timer?</AlertDialogTitle>
            <AlertDialogDescription>
              Starting a new timer will stop the current one and save its elapsed time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQueuedStart(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace}>Stop and start new</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Log time manually</DialogTitle>
          </DialogHeader>
          <ManualTimeEntryForm
            projects={initialProjects}
            clients={initialClients}
            onSuccess={() => setManualOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex justify-between"><kbd className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">s</kbd> Start or stop</li>
            <li className="flex justify-between"><kbd className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">p</kbd> Pause or resume</li>
            <li className="flex justify-between"><kbd className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">n</kbd> New manual entry</li>
            <li className="flex justify-between"><kbd className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">?</kbd> This list</li>
          </ul>
        </DialogContent>
      </Dialog>
    </TimerSessionProvider>
  );
}
