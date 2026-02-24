"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Link2 } from "lucide-react";
import { InvoiceBlock } from "@/types";
import { assignWorkToInvoiceBlock, getInvoiceBlockWorkOptions } from "@/server/actions/invoice-blocks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface InvoiceBlockWorkDialogProps {
  block: InvoiceBlock;
  clientName: string;
}

function formatEntryDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const InvoiceBlockWorkDialog: React.FC<InvoiceBlockWorkDialogProps> = ({ block, clientName }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<WorkOptionsData | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  const loadOptions = async () => {
    setIsLoading(true);
    const result = await getInvoiceBlockWorkOptions(block.clientId, block.id);

    if (result.success && result.data) {
      setOptions(result.data as WorkOptionsData);
    } else {
      setOptions(null);
      alert(result.error || "Failed to load invoice block work options");
    }

    setIsLoading(false);
  };

  const addableEntries = useMemo(
    () => (options?.entries || []).filter((entry) => !entry.alreadyInBlock),
    [options]
  );
  const linkedProjectsCount = useMemo(
    () => (options?.projects || []).filter((project) => project.isLinked).length,
    [options]
  );
  const alreadyAssignedHours = useMemo(() => {
    const seconds = (options?.entries || [])
      .filter((entry) => entry.alreadyInBlock)
      .reduce((sum, entry) => sum + entry.durationSeconds, 0);
    return parseFloat((seconds / 3600).toFixed(2));
  }, [options]);

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

  const resetSelection = () => {
    setSelectedEntryIds(new Set());
    setSelectedProjectIds(new Set());
  };
  const selectAllEntries = () => {
    setSelectedEntryIds(new Set(addableEntries.map((entry) => entry.id)));
  };

  const handleApply = () => {
    if (selectedEntryIds.size === 0 && selectedProjectIds.size === 0) {
      alert("Select at least one entry or project");
      return;
    }

    startTransition(async () => {
      const result = await assignWorkToInvoiceBlock({
        blockId: block.id,
        entryIds: [...selectedEntryIds],
        projectIds: [...selectedProjectIds],
      });

      if (!result.success) {
        alert(result.error || "Failed to add work to invoice block");
        return;
      }

      resetSelection();
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
          resetSelection();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Plus size={12} className="mr-1" />
          Add Work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Add Work to Invoice Block</DialogTitle>
          <DialogDescription>
            Select unassigned entries and/or link projects for <strong>{clientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading work options...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-4">
              <span>Already in block: {alreadyAssignedHours.toFixed(2)}h</span>
              <span>Linked projects: {linkedProjectsCount}</span>
              <span>Selected entries: {summary.entryCount}</span>
              <span>Total hours: {summary.totalHours.toFixed(2)}h</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Projects (live link future entries)</p>
                <span className="text-[11px] text-slate-500">Future entries on linked projects are auto-added</span>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                {(options?.projects || []).length === 0 ? (
                  <div className="px-3 py-6 text-sm text-slate-500 text-center">No client projects found.</div>
                ) : (options?.projects || []).map((project) => {
                  const selectable = !project.isLinked;
                  return (
                    <label
                      key={project.id}
                      className={`flex items-center justify-between px-3 py-2 text-sm ${selectable ? "cursor-pointer hover:bg-slate-50" : "opacity-60"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={project.isLinked || selectedProjectIds.has(project.id)}
                          disabled={!selectable || isPending}
                          onCheckedChange={(checked) => toggleProject(project.id, checked === true)}
                        />
                        <span className="font-medium text-slate-700">{project.name}</span>
                        {project.isLinked && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                            <Link2 size={10} />
                            linked
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {project.unassignedHours.toFixed(2)}h unassigned
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Individual Entries</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[11px] text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                    disabled={isPending || addableEntries.length === 0}
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
              <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                {addableEntries.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-slate-500 text-center">No unassigned entries available.</div>
                ) : (
                  addableEntries.map((entry) => (
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
            onClick={handleApply}
          >
            {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
            Apply Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceBlockWorkDialog;
