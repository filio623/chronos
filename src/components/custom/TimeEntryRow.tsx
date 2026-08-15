import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { TimeEntry, Project, Tag } from '@/types';
import { Play, DollarSign, MoreVertical, Calendar, Trash2, Loader2, Pencil, Copy, Scissors } from 'lucide-react';
import ConfirmDeleteDialog from "@/components/custom/ConfirmDeleteDialog";
import { defaultLocalDateKey, formatLocalTime, getLocalDateKey, hhmmFromDate, hhmmFromIso, resolveManualRange } from '@/lib/time';
import { LiveElapsed } from './LiveElapsed';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteTimeEntry, duplicateTimeEntry, restoreTimeEntry, splitTimeEntry, updateTimeEntry } from '@/server/actions/time-entries';
import { assignTagsToEntry } from '@/server/actions/tags';
import TagPicker from './TagPicker';

interface TimeEntryRowProps {
  entry: TimeEntry;
  project?: Project;
  projects?: Project[];
  availableTags: Tag[];
  onRestart: (entry: TimeEntry) => void;
}

const TimeEntryRow: React.FC<TimeEntryRowProps> = ({ entry, project, projects = [], availableTags, onRestart }) => {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTime, setSplitTime] = useState('');
  const [overlapOpen, setOverlapOpen] = useState(false);
  const [pendingOverlap, setPendingOverlap] = useState<null | {
    description: string;
    projectId: string | null;
    startTime: Date;
    endTime: Date | undefined;
  }>(null);
  const [editDescription, setEditDescription] = useState(entry.description);
  const [editProjectId, setEditProjectId] = useState(entry.projectId || 'none');
  const [editDate, setEditDate] = useState(getLocalDateKey(entry.startTimeISO || entry.startTime) || defaultLocalDateKey());
  const [editStart, setEditStart] = useState(hhmmFromIso(entry.startTimeISO || entry.startTime));
  const [editEnd, setEditEnd] = useState(
    entry.endTime && entry.endTime !== 'Running...' && entry.endTime !== 'Paused'
      ? hhmmFromIso(entry.endTime)
      : '10:00'
  );
  const isLive = !entry.endTime || entry.endTime === 'Running...' || entry.endTime === 'Paused';
  const [selectedTagIds, setSelectedTagIds] = useState(() => entry.tags?.map(t => t.id) || []);
  const [localBillable, setLocalBillable] = useState(entry.isBillable);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [localRateOverride, setLocalRateOverride] = useState<number | null>(entry.rateOverride ?? null);
  const [localEffectiveRate, setLocalEffectiveRate] = useState<number | null>(entry.effectiveRate ?? null);
  const [localRateSource, setLocalRateSource] = useState(entry.rateSource ?? 'none');

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteDialog(false);
    startTransition(async () => {
      const result = await deleteTimeEntry(entry.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete entry');
        return;
      }
      const snapshot = result.snapshot;
      toast.success('Entry deleted', {
        action: snapshot
          ? {
              label: 'Undo',
              onClick: () => {
                void restoreTimeEntry(snapshot).then((restored) => {
                  if (!restored.success) toast.error(restored.error || 'Failed to restore entry');
                });
              },
            }
          : undefined,
      });
    });
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      const result = await duplicateTimeEntry(entry.id);
      if (!result.success) toast.error(result.error || 'Failed to duplicate entry');
      else toast.success('Entry duplicated');
    });
  };

  const openSplit = () => {
    if (isLive) {
      toast.error('Stop the timer before splitting it');
      return;
    }
    const start = new Date(entry.startTimeISO || entry.startTime);
    const end = new Date(entry.endTime);
    const mid = new Date((start.getTime() + end.getTime()) / 2);
    setSplitTime(hhmmFromDate(mid));
    setSplitOpen(true);
  };

  const handleSplit = () => {
    const range = resolveManualRange(editDate || getLocalDateKey(entry.startTimeISO || entry.startTime), splitTime, splitTime);
    if (!range) {
      toast.error('Enter a valid split time');
      return;
    }
    startTransition(async () => {
      const result = await splitTimeEntry(entry.id, range.start);
      if (!result.success) {
        toast.error(result.error || 'Failed to split entry');
        return;
      }
      setSplitOpen(false);
      toast.success('Entry split');
    });
  };

  const handleBillableToggle = () => {
    const nextBillable = !localBillable;
    setLocalBillable(nextBillable);
    startTransition(async () => {
      const result = await updateTimeEntry(entry.id, { isBillable: nextBillable });
      if (!result.success) {
        setLocalBillable(!nextBillable);
        toast.error(result.error || 'Failed to update entry');
      }
    });
  };

  const handleTagsChange = (tagIds: string[]) => {
    const previous = selectedTagIds;
    setSelectedTagIds(tagIds);
    startTransition(async () => {
      const result = await assignTagsToEntry(entry.id, tagIds);
      if (!result.success) {
        setSelectedTagIds(previous);
        toast.error(result.error || 'Failed to assign tags');
      }
    });
  };

  const openEdit = () => {
    setEditDescription(entry.description);
    setEditProjectId(entry.projectId || 'none');
    setEditDate(getLocalDateKey(entry.startTimeISO || entry.startTime) || defaultLocalDateKey());
    setEditStart(hhmmFromIso(entry.startTimeISO || entry.startTime));
    if (entry.endTime && entry.endTime !== 'Running...' && entry.endTime !== 'Paused') {
      setEditEnd(hhmmFromIso(entry.endTime));
    }
    setEditOpen(true);
  };

  const handleEditSave = () => {
    const range = resolveManualRange(editDate, editStart, editEnd);
    if (!range) {
      toast.error('Please enter a valid start and end time.');
      return;
    }
    const payload = {
      description: editDescription,
      projectId: editProjectId === 'none' ? null : editProjectId,
      startTime: range.start,
      endTime: isLive ? undefined : range.end,
    };
    startTransition(async () => {
      const result = await updateTimeEntry(entry.id, payload);
      if ('code' in result && result.code === 'OVERLAP') {
        setPendingOverlap(payload);
        setOverlapOpen(true);
        return;
      }
      if (!result.success) {
        toast.error(result.error || 'Failed to update entry');
        return;
      }
      setEditOpen(false);
    });
  };

  const confirmOverlapSave = () => {
    if (!pendingOverlap) return;
    startTransition(async () => {
      const result = await updateTimeEntry(entry.id, { ...pendingOverlap, confirmOverlap: true });
      if (!result.success) {
        toast.error(result.error || 'Failed to update entry');
        return;
      }
      setOverlapOpen(false);
      setPendingOverlap(null);
      setEditOpen(false);
    });
  };

  const handleRateSave = () => {
    const raw = rateInput.trim();
    if (!raw) return;
    const value = parseFloat(raw);
    if (Number.isNaN(value)) return;
    setLocalRateOverride(value);
    setLocalEffectiveRate(value);
    setLocalRateSource('entry');
    startTransition(async () => {
      const result = await updateTimeEntry(entry.id, { rateOverride: value });
      if (!result.success) toast.error(result.error || 'Failed to update rate');
    });
    setRateOpen(false);
  };

  const handleRateClear = () => {
    setLocalRateOverride(null);
    // Restore inherited rate from project or client instead of clearing to null
    if (project?.hourlyRate !== null && project?.hourlyRate !== undefined) {
      setLocalEffectiveRate(project.hourlyRate);
      setLocalRateSource('project');
    } else {
      // Will be corrected on server revalidation with actual client rate
      setLocalEffectiveRate(null);
      setLocalRateSource('none');
    }
    startTransition(async () => {
      const result = await updateTimeEntry(entry.id, { rateOverride: null });
      if (!result.success) toast.error(result.error || 'Failed to clear rate');
    });
    setRateOpen(false);
  };

  const renderRateLabel = () => {
    if (localEffectiveRate === null || localEffectiveRate === undefined) return null;
    const label = localRateSource === 'entry'
      ? 'entry'
      : localRateSource === 'project'
        ? 'project'
        : localRateSource === 'client'
          ? 'client'
          : null;
    if (!label) return null;
    return (
      <span className="text-[10px] uppercase text-slate-400 ml-1">
        {label}
      </span>
    );
  };

  const renderOverrideDot = () => {
    if (localRateOverride === null || localRateOverride === undefined) return null;
    return <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />;
  };

  return (
    <div className={`group flex items-center justify-between py-3 px-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-all ${isPending ? 'opacity-50 grayscale' : ''}`}>
      
      {/* Left Side: Description & Project Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
          {/* Description */}
          <button
            type="button"
            onClick={openEdit}
            className="text-sm font-medium text-slate-700 truncate text-left"
          >
            {entry.description || '(No description)'}
          </button>
          
          {/* Project & Client */}
          {project ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full ${project.color.replace('text-', 'bg-')}`}></span>
              <span className={`text-sm font-medium ${project.color} truncate`}>
                {project.name}
              </span>
              <span className="hidden sm:inline text-slate-400 mx-1">-</span>
              <span className="hidden sm:inline text-sm text-slate-500 truncate">{project.client}</span>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">No project</span>
          )}
        </div>
      </div>

      {/* Right Side: Meta Data & Actions */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        
        {/* Tags */}
        <div className="hidden md:flex">
          <TagPicker
            availableTags={availableTags}
            selectedTagIds={selectedTagIds}
            onSelectionChange={handleTagsChange}
            disabled={isPending}
            compact
          />
        </div>

        {/* Billable Status */}
        <button
          type="button"
          onClick={handleBillableToggle}
          className={`flex items-center justify-center w-5 ${localBillable ? 'text-blue-500' : 'text-slate-200 hover:text-slate-400'} transition-colors`}
          title={localBillable ? "Billable (click to toggle)" : "Non-billable (click to toggle)"}
          disabled={isPending}
        >
          <DollarSign size={16} />
        </button>

        {/* Rate */}
        <div className="hidden lg:flex items-center text-xs text-slate-500 w-24 justify-end">
          <Popover open={rateOpen} onOpenChange={(open) => {
            setRateOpen(open);
            if (open) {
              const baseRate = localRateOverride ?? entry.rateOverride ?? entry.effectiveRate ?? null;
              setRateInput(baseRate !== null ? String(baseRate) : '');
            }
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors ${localRateSource === 'entry' ? 'text-slate-700' : 'text-slate-400'}`}
                title={localRateOverride !== null ? "Entry rate override" : "Inherited rate"}
                disabled={isPending}
              >
                {localEffectiveRate !== null && localEffectiveRate !== undefined ? (
                  <span className="flex items-center">
                    {`$${localEffectiveRate}/hr`}
                    {renderOverrideDot()}
                    {renderRateLabel()}
                  </span>
                ) : (
                  'Rate'
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-600">Entry Rate Override</div>
                <Input
                  type="number"
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="e.g. 50"
                  disabled={isPending}
                />
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" onClick={handleRateSave} disabled={isPending || !rateInput.trim()}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleRateClear} disabled={isPending || localRateOverride === null}>
                    Clear
                  </Button>
                </div>
                <div className="text-[10px] text-slate-400">
                  {localRateOverride !== null ? 'Override set for this entry only' : 'Inherits from project or client'}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Interval */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500 w-32 justify-end">
            <span>{formatLocalTime(entry.startTime)}</span>
            <span>-</span>
            <span>{formatLocalTime(entry.endTime)}</span>
        </div>

        {/* Calendar Icon (Visual) */}
        <div className="hidden xl:flex text-slate-300">
            <Calendar size={14} />
        </div>

        {/* Duration */}
        <div className="text-sm sm:text-base font-mono font-medium text-slate-800 w-20 text-right">
            {isLive ? <LiveElapsed entry={entry} className="live-row-duration" /> : entry.duration}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
            <button 
                onClick={() => onRestart(entry)}
                disabled={isPending}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
                title="Restart"
            >
                <Play size={18} fill="currentColor" className="opacity-80" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 text-slate-300 hover:text-slate-600 rounded-md transition-colors"
                  disabled={isPending}
                  aria-label="Open entry menu"
                >
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEdit} className="cursor-pointer">
                  <Pencil size={14} className="mr-2" />
                  Edit entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
                  <Copy size={14} className="mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openSplit} className="cursor-pointer">
                  <Scissors size={14} className="mr-2" />
                  Split at time
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer">
                  <Trash2 size={14} className="mr-2" />
                  Delete Entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        description="Are you sure you want to delete this time entry?"
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit time entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Description</Label>
              <Input id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={editProjectId} onValueChange={setEditProjectId} disabled={isPending}>
                <SelectTrigger id="edit-project"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} disabled={isPending} />
              </div>
              <div className="space-y-1">
                <Label>Start</Label>
                <Input id="edit-start" type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} disabled={isPending} />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input id="edit-end" type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} disabled={isPending || isLive} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleEditSave} disabled={isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Split entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Split at</Label>
            <Input type="time" value={splitTime} onChange={(e) => setSplitTime(e.target.value)} />
            <p className="text-xs text-slate-500">Creates two entries whose durations add up to the original.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSplitOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSplit} disabled={isPending}>Split</Button>
          </DialogFooter>
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
            <AlertDialogCancel onClick={() => setPendingOverlap(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverlapSave}>Save anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimeEntryRow;
