import React, { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DollarSign, Loader2, Pause, Play, Square } from "lucide-react";
import { Project, Client } from "@/types";
import { createProject } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectPicker } from "./ProjectPicker";
import { resolveDefaultBillableClient } from "@/lib/billable/resolve-client";
import type { RecentTask } from "@/lib/tracking";

export type StartTimerPayload = {
  projectId: string | null;
  description: string;
  isBillable?: boolean;
};

interface TimerBarProps {
  projects: Project[];
  clients?: Client[];
  activeProject: Project | null;
  description: string;
  clientName: string | null;
  isActive: boolean;
  isPaused: boolean;
  isStarting: boolean;
  isBillable: boolean;
  recents: RecentTask[];
  onStart: (projectId: string | null, description: string, options?: { isBillable?: boolean }) => Promise<boolean>;
  onStop: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onRetarget: (patch: { description?: string; projectId?: string | null; isBillable?: boolean }) => Promise<void>;
  onRegisterIdleStart?: (fn: (() => Promise<void>) | null) => void;
  elapsed: React.ReactNode;
}

const TimerBar: React.FC<TimerBarProps> = ({
  projects,
  clients = [],
  activeProject,
  description,
  clientName,
  isActive,
  isPaused,
  isStarting,
  isBillable,
  recents,
  onStart,
  onStop,
  onPause,
  onResume,
  onRetarget,
  onRegisterIdleStart,
  elapsed,
}) => {
  const [taskInput, setTaskInput] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | "none">("none");
  const [billableTouched, setBillableTouched] = useState(false);
  const [idleBillable, setIdleBillable] = useState(true);
  const [runDescription, setRunDescription] = useState(description);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState<string | "none">("none");
  const [isPending, startTransition] = useTransition();

  const defaultBillable = resolveDefaultBillableClient({
    projectId: selectedProjectId,
    projects,
    clients,
  });
  const displayBillable = billableTouched ? idleBillable : defaultBillable;
  const recentProjectIds = recents
    .map((task) => task.projectId)
    .filter((id): id is string => !!id);
  const lastRecent = recents[0] ?? null;

  useEffect(() => {
    setRunDescription(description);
  }, [description]);

  const handleStart = useCallback(async () => {
    if (isStarting) return;
    const projectId = selectedProjectId === "none" ? null : selectedProjectId;
    const started = await onStart(projectId, taskInput, { isBillable: displayBillable });
    if (started) {
      setTaskInput("");
      setBillableTouched(false);
    }
  }, [displayBillable, isStarting, onStart, selectedProjectId, taskInput]);

  useEffect(() => {
    onRegisterIdleStart?.(handleStart);
    return () => onRegisterIdleStart?.(null);
  }, [onRegisterIdleStart, handleStart]);

  const handleProjectChange = (value: string | "none" | "create-new") => {
    if (value === "create-new") {
      setIsCreateDialogOpen(true);
      return;
    }
    setSelectedProjectId(value);
    setBillableTouched(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const formData = new FormData();
    formData.append("name", newProjectName);
    if (newProjectClientId && newProjectClientId !== "none") {
      formData.append("clientId", newProjectClientId);
    }

    startTransition(async () => {
      const result = await createProject(formData);
      if (result.success) {
        if (result.data?.id) setSelectedProjectId(result.data.id);
        setIsCreateDialogOpen(false);
        setNewProjectName("");
        setNewProjectClientId("none");
      } else {
        toast.error(result.error || "Failed to create project");
      }
    });
  };

  const handleContinue = async (task: RecentTask) => {
    if (isStarting) return;
    if (task.projectId) setSelectedProjectId(task.projectId);
    else setSelectedProjectId("none");
    setTaskInput(task.description);
    setIdleBillable(task.isBillable);
    setBillableTouched(true);
    await onStart(task.projectId, task.description, { isBillable: task.isBillable });
  };

  const persistRunDescription = () => {
    if (runDescription !== description) {
      void onRetarget({ description: runDescription });
    }
  };

  if (isActive) {
    const title = runDescription || (activeProject ? "Untitled" : "Untitled task");
    return (
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-indigo-100 dark:border-indigo-900 px-4 md:px-6 py-3 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {elapsed}
            <div className="h-8 w-px bg-slate-200 shrink-0 hidden sm:block"></div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1">
              <Input
                aria-label="Running description"
                value={runDescription}
                onChange={(e) => setRunDescription(e.target.value)}
                onBlur={persistRunDescription}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    persistRunDescription();
                  }
                }}
                placeholder={title}
                className="h-9 text-sm"
              />
              <ProjectPicker
                projects={projects}
                value={activeProject?.id ?? "none"}
                recentProjectIds={recentProjectIds}
                allowCreate={false}
                onChange={(value) => {
                  if (value === "create-new") return;
                  void onRetarget({ projectId: value === "none" ? null : value });
                }}
                className="w-44 h-9"
              />
              <button
                type="button"
                onClick={() => void onRetarget({ isBillable: !isBillable })}
                className={`flex items-center justify-center w-9 h-9 rounded-md border ${
                  isBillable
                    ? "text-blue-600 border-blue-200 bg-blue-50"
                    : "text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
                aria-label={isBillable ? "Billable" : "Non-billable"}
                aria-pressed={isBillable}
                title={isBillable ? "Billable" : "Non-billable"}
              >
                <DollarSign size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPaused ? (
              <button
                onClick={onResume}
                className="flex items-center justify-center w-10 h-10 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 hover:scale-105 transition-all active:scale-95 border border-emerald-200"
                title="Resume Timer"
                aria-label="Resume Timer"
              >
                <Play size={18} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex items-center justify-center w-10 h-10 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 hover:scale-105 transition-all active:scale-95 border border-amber-200"
                title="Pause Timer"
                aria-label="Pause Timer"
              >
                <Pause size={18} />
              </button>
            )}
            <button
              onClick={onStop}
              className="flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 hover:scale-105 transition-all active:scale-95 border border-rose-200"
              title="Stop Timer"
              aria-label="Stop Timer"
            >
              <Square size={18} fill="currentColor" />
            </button>
          </div>
        </div>
        {(activeProject || clientName) && (
          <div className="max-w-5xl mx-auto mt-1 text-xs text-slate-500 truncate">
            {activeProject?.name}
            {clientName && <span className="text-slate-400"> · {clientName}</span>}
            {isPaused && <span> · Paused</span>}
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-600 animate-[pulse_2s_infinite]" style={{ width: "100%" }}></div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center gap-2">
        <div className="relative flex-1 flex items-center gap-2">
          <Input
            type="text"
            placeholder="What are you working on?"
            className="flex-1 h-[42px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            disabled={isStarting}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
          />

          <div className="w-52">
            <ProjectPicker
              projects={projects}
              value={selectedProjectId}
              onChange={handleProjectChange}
              recentProjectIds={recentProjectIds}
              disabled={isStarting}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setIdleBillable(!displayBillable);
              setBillableTouched(true);
            }}
            disabled={isStarting}
            className={`flex items-center justify-center w-[42px] h-[42px] rounded-md border ${
              displayBillable
                ? "text-blue-600 border-blue-200 bg-blue-50"
                : "text-slate-400 border-slate-200 bg-white"
            }`}
            aria-label={displayBillable ? "Billable" : "Non-billable"}
            aria-pressed={displayBillable}
            title={displayBillable ? "Billable" : "Non-billable"}
          >
            <DollarSign size={16} />
            <span className="sr-only">{displayBillable ? "Billable" : "Non-billable"}</span>
          </button>
        </div>

        <Button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          aria-label="Start timer"
          className="h-[42px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isStarting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
          Start
        </Button>
      </div>

      {(lastRecent || recents.length > 0) && (
        <div className="max-w-5xl mx-auto mt-2 flex flex-wrap items-center gap-2">
          {lastRecent && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isStarting}
              onClick={() => handleContinue(lastRecent)}
            >
              Continue {lastRecent.description || "last task"}
            </Button>
          )}
          {recents.slice(0, 5).map((task, index) => (
            <button
              key={`${task.projectId ?? "none"}-${task.description}-${index}`}
              type="button"
              disabled={isStarting}
              onClick={() => handleContinue(task)}
              className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 max-w-[180px] truncate"
              title={task.description}
            >
              {task.description || projects.find((p) => p.id === task.projectId)?.name || "Untitled"}
            </button>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Quick Create Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-project-name">Project Name</Label>
              <Input
                id="quick-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Website Redesign"
                disabled={isPending}
                autoFocus
              />
            </div>

            {clients.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="quick-project-client">Client (optional)</Label>
                <Select value={newProjectClientId} onValueChange={setNewProjectClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !newProjectName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimerBar;
