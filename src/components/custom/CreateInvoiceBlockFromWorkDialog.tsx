"use client";

import React, { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Target } from "lucide-react";
import { createInvoiceBlockFromWork, getInvoiceBlockWorkOptions } from "@/server/actions/invoice-blocks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WorkEntryOption {
  id: string;
  description: string;
  startTime: string;
  durationSeconds: number;
  durationHours: number;
  projectId: string | null;
  projectName: string | null;
  alreadyInBlock: boolean;
}

interface WorkProjectOption {
  id: string;
  name: string;
  isLinked: boolean;
  unassignedEntryIds: string[];
  unassignedHours: number;
  assignedHoursInBlock: number;
}

interface WorkOptionsData {
  entries: WorkEntryOption[];
  projects: WorkProjectOption[];
}

interface CreateInvoiceBlockFromWorkDialogProps {
  clientId: string;
  clientName: string;
  trigger?: React.ReactNode;
}

function formatEntryDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CreateInvoiceBlockFromWorkDialog: React.FC<CreateInvoiceBlockFromWorkDialogProps> = ({
  clientId,
  clientName,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<WorkOptionsData | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [hoursTarget, setHoursTarget] = useState("10");
  const [notes, setNotes] = useState("");
  const [targetTouched, setTargetTouched] = useState(false);

  const loadOptions = async () => {
    setIsLoading(true);
    const result = await getInvoiceBlockWorkOptions(clientId);

    if (result.success && result.data) {
      setOptions(result.data as WorkOptionsData);
    } else {
      setOptions(null);
      toast.error(result.error || "Failed to load client work options");
    }

    setIsLoading(false);
  };

  const summary = useMemo(() => {
    if (!options) {
      return {
        entryCount: 0,
        totalHours: 0,
      };
    }

    const entrySecondsById = new Map(options.entries.map((entry) => [entry.id, entry.durationSeconds]));
    const resolvedEntryIds = new Set<string>();

    for (const entryId of selectedEntryIds) {
      resolvedEntryIds.add(entryId);
    }

    for (const projectId of selectedProjectIds) {
      const project = options.projects.find((item) => item.id === projectId);
      if (!project) continue;
      for (const entryId of project.unassignedEntryIds) {
        resolvedEntryIds.add(entryId);
      }
    }

    let totalSeconds = 0;
    for (const entryId of resolvedEntryIds) {
      totalSeconds += entrySecondsById.get(entryId) || 0;
    }

    return {
      entryCount: resolvedEntryIds.size,
      totalHours: parseFloat((totalSeconds / 3600).toFixed(2)),
    };
  }, [options, selectedEntryIds, selectedProjectIds]);

  const computedTargetHours = targetTouched
    ? hoursTarget
    : summary.totalHours > 0
      ? summary.totalHours.toFixed(2)
      : "10";

  const resetState = () => {
    setSelectedEntryIds(new Set());
    setSelectedProjectIds(new Set());
    setNotes("");
    setHoursTarget("10");
    setTargetTouched(false);
    setOptions(null);
  };

  const toggleEntry = (entryId: string, checked: boolean) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(entryId);
      } else {
        next.delete(entryId);
      }
      return next;
    });
  };

  const toggleProject = (projectId: string, checked: boolean) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };
  const selectAllEntries = () => {
    setSelectedEntryIds(new Set((options?.entries || []).map((entry) => entry.id)));
  };

  const handleCreate = () => {
    if (selectedEntryIds.size === 0 && selectedProjectIds.size === 0) {
      toast.error("Select at least one entry or project");
      return;
    }

    startTransition(async () => {
      const parsedTarget = parseFloat(computedTargetHours);
      const result = await createInvoiceBlockFromWork({
        clientId,
        entryIds: [...selectedEntryIds],
        projectIds: [...selectedProjectIds],
        hoursTarget: Number.isFinite(parsedTarget) ? parsedTarget : undefined,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create invoice block from selected work");
        return;
      }

      resetState();
      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          loadOptions();
        } else {
          resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-xs">
            <Target size={12} className="mr-1" />
            Create From Work
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Invoice Block from Work</DialogTitle>
          <DialogDescription>
            Select entries/projects for <strong>{clientName}</strong> and create a new active block.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading client work...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-4">
              <span>Selected entries: {summary.entryCount}</span>
              <span>Selected hours: {summary.totalHours.toFixed(2)}h</span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Projects (live link future entries)</p>
                  <span className="text-[11px] text-slate-500">Future entries are auto-added</span>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                  {(options?.projects || []).length === 0 ? (
                    <div className="px-3 py-6 text-sm text-slate-500 text-center">No client projects found.</div>
                  ) : (options?.projects || []).map((project) => (
                    <label key={project.id} className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedProjectIds.has(project.id)}
                          disabled={isPending}
                          onCheckedChange={(checked) => toggleProject(project.id, checked === true)}
                        />
                        <span className="text-sm text-slate-700">{project.name}</span>
                      </div>
                      <div className="text-xs text-slate-500">{project.unassignedHours.toFixed(2)}h</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Entries</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                      disabled={isPending || (options?.entries || []).length === 0}
                      onClick={selectAllEntries}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-slate-500 hover:underline disabled:text-slate-400 disabled:no-underline"
                      disabled={isPending || selectedEntryIds.size === 0}
                      onClick={() => setSelectedEntryIds(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                  {(options?.entries || []).length === 0 ? (
                    <div className="px-3 py-6 text-sm text-slate-500 text-center">No unassigned entries found.</div>
                  ) : (
                    (options?.entries || []).map((entry) => (
                      <label key={entry.id} className="flex items-start justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <div className="flex items-start gap-2 min-w-0">
                          <Checkbox
                            checked={selectedEntryIds.has(entry.id)}
                            disabled={isPending}
                            onCheckedChange={(checked) => toggleEntry(entry.id, checked === true)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="text-sm text-slate-700 truncate">{entry.description}</div>
                            <div className="text-xs text-slate-500">
                              {formatEntryDate(entry.startTime)}
                              {entry.projectName ? ` • ${entry.projectName}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-mono text-slate-600 whitespace-nowrap">{entry.durationHours.toFixed(2)}h</div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="block-hours">Target Hours</Label>
                <Input
                  id="block-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={computedTargetHours}
                  onChange={(e) => {
                    setHoursTarget(e.target.value);
                    setTargetTouched(true);
                  }}
                  disabled={isPending}
                />
                <p className="text-[10px] text-slate-500">Defaults to selected hours, and you can edit it.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-notes">Notes (optional)</Label>
                <Textarea
                  id="block-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. March invoice block"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleCreate}
          >
            {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
            Create Block from Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceBlockFromWorkDialog;
