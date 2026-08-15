"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Project, Client } from "@/types";
import { createProject } from "@/server/actions/projects";
import { createClient } from "@/server/actions/clients";
import { logManualTimeEntry } from "@/server/actions/time-entries";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveDefaultBillableClient } from "@/lib/billable/resolve-client";
import { defaultLocalDateKey, resolveManualRange } from "@/lib/time";

export type ManualEntryPayload = {
  projectId: string | null;
  clientId: string | null;
  description: string;
  startTime: Date;
  endTime: Date;
  isBillable: boolean;
  rateOverride: number | null;
};

export function ManualTimeEntryForm({
  projects,
  clients,
  onSuccess,
  submitLabel = "Save Entry",
}: {
  projects: Project[];
  clients: Client[];
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"range" | "duration">("range");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [clientId, setClientId] = useState("none");
  const [date, setDate] = useState(() => defaultLocalDateKey());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [isBillable, setIsBillable] = useState(true);
  const [billableTouched, setBillableTouched] = useState(false);
  const [rateOverride, setRateOverride] = useState("");
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("none");
  const [newClientName, setNewClientName] = useState("");
  const [newClientCurrency, setNewClientCurrency] = useState("USD");
  const [overlapOpen, setOverlapOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ManualEntryPayload | null>(null);

  const selectedProject = projectId !== "none" ? projects.find((p) => p.id === projectId) || null : null;
  const isClientLocked = !!selectedProject?.clientId;
  const displayClientId = selectedProject?.clientId ?? clientId;

  const displayBillable = billableTouched
    ? isBillable
    : resolveDefaultBillableClient({ projectId, clientId: displayClientId, projects, clients });

  const reset = () => {
    setDescription("");
    setProjectId("none");
    setClientId("none");
    setDate(defaultLocalDateKey());
    setStartTime("09:00");
    setEndTime("10:00");
    setHours("1");
    setMinutes("0");
    setIsBillable(true);
    setBillableTouched(false);
    setRateOverride("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let start: Date;
    let end: Date;

    if (mode === "range") {
      const range = resolveManualRange(date, startTime, endTime);
      if (!range) {
        toast.error("Please enter a valid start and end time.");
        return;
      }
      start = range.start;
      end = range.end;
    } else {
      const totalMinutes = Math.max(0, parseInt(hours || "0", 10)) * 60 + Math.max(0, parseInt(minutes || "0", 10));
      if (totalMinutes <= 0) {
        toast.error("Please enter a duration greater than 0.");
        return;
      }
      const range = resolveManualRange(date, startTime || "00:00", startTime || "00:00");
      if (!range) {
        toast.error("Please enter a valid start time.");
        return;
      }
      start = range.start;
      end = new Date(start.getTime() + totalMinutes * 60000);
    }

    const payload: ManualEntryPayload = {
      projectId: projectId === "none" ? null : projectId,
      clientId: displayClientId === "none" ? null : displayClientId,
      description,
      startTime: start,
      endTime: end,
      isBillable: displayBillable,
      rateOverride: rateOverride.trim() ? parseFloat(rateOverride) : null,
    };
    startTransition(async () => {
      const result = await logManualTimeEntry(payload);
      if ("code" in result && result.code === "OVERLAP") {
        setPendingPayload(payload);
        setOverlapOpen(true);
        return;
      }
      if (!result.success) {
        toast.error(result.error || "Failed to log entry");
        return;
      }
      reset();
      onSuccess?.();
    });
  };

  const confirmOverlapSave = () => {
    if (!pendingPayload) return;
    startTransition(async () => {
      const result = await logManualTimeEntry({ ...pendingPayload, confirmOverlap: true });
      if (!result.success) {
        toast.error(result.error || "Failed to log entry");
        return;
      }
      setOverlapOpen(false);
      setPendingPayload(null);
      reset();
      onSuccess?.();
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const formData = new FormData();
    formData.append("name", newProjectName);
    if (newProjectClientId !== "none") formData.append("clientId", newProjectClientId);
    startTransition(async () => {
      const result = await createProject(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to create project");
        return;
      }
      if (result.data?.id) setProjectId(result.data.id);
      setIsCreateProjectOpen(false);
      setNewProjectName("");
      setNewProjectClientId("none");
    });
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const formData = new FormData();
    formData.append("name", newClientName);
    formData.append("currency", newClientCurrency || "USD");
    startTransition(async () => {
      const result = await createClient(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to create client");
        return;
      }
      if (result.data?.id) setClientId(result.data.id);
      setIsCreateClientOpen(false);
      setNewClientName("");
      setNewClientCurrency("USD");
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>What did you work on?</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description..."
            required
            disabled={isPending}
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select
              value={projectId}
              disabled={isPending}
              onValueChange={(value) => {
                if (value === "create-new-project") {
                  setIsCreateProjectOpen(true);
                  return;
                }
                setProjectId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                <SelectSeparator />
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="create-new-project">
                  <span className="flex items-center gap-2 text-indigo-600">
                    <Plus size={12} /> Create new project...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Client (optional)</Label>
            <Select
              value={displayClientId}
              disabled={isPending || isClientLocked}
              onValueChange={(value) => {
                if (value === "create-new-client") {
                  setIsCreateClientOpen(true);
                  return;
                }
                setClientId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isClientLocked ? "Linked to project" : "Select client"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                <SelectSeparator />
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="create-new-client">
                  <span className="flex items-center gap-2 text-indigo-600">
                    <Plus size={12} /> Create new client...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="manual-date">Date</Label>
            <Input id="manual-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label>Billable</Label>
            <div className="flex items-center gap-2 h-10">
              <Switch
                checked={displayBillable}
                onCheckedChange={(checked) => {
                  setIsBillable(checked);
                  setBillableTouched(true);
                }}
                disabled={isPending}
              />
              <span className="text-xs text-slate-500">{displayBillable ? "Billable" : "Non-billable"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Rate override (hourly)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g. 50"
            value={rateOverride}
            onChange={(e) => setRateOverride(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant={mode === "range" ? "default" : "outline"} onClick={() => setMode("range")}>
            Time range
          </Button>
          <Button type="button" variant={mode === "duration" ? "default" : "outline"} onClick={() => setMode("duration")}>
            Duration
          </Button>
        </div>

        {mode === "range" ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isPending} />
              <p className="text-[10px] text-slate-500">If end is earlier than start, the entry wraps to the next day.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>Minutes</Label>
              <Input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isPending} />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
            {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </form>

      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Quick Create Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" autoFocus />
            <Select value={newProjectClientId} onValueChange={setNewProjectClientId}>
              <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={isPending || !newProjectName.trim()}>Create</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateClientOpen} onOpenChange={setIsCreateClientOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Quick Create Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Client name" autoFocus />
            <Input value={newClientCurrency} onChange={(e) => setNewClientCurrency(e.target.value)} placeholder="USD" maxLength={3} />
            <Button type="submit" disabled={isPending || !newClientName.trim()}>Create</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={overlapOpen} onOpenChange={setOverlapOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overlapping time</AlertDialogTitle>
            <AlertDialogDescription>
              This range overlaps another entry. Saving will count both toward the retainer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingPayload(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverlapSave}>Save anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
