import React, { useMemo, useState, useTransition } from 'react';
import { TimeEntry, Project } from '@/types';
import TimeEntryRow from './TimeEntryRow';
import { Plus, Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { logManualTimeEntry } from '@/server/actions/time-entries';
import { getLocalDateKey, parseDateKeyToLocalDate } from '@/lib/time';

interface TrackerListProps {
  entries: TimeEntry[];
  projects: Project[];
  onRestart: (entry: TimeEntry) => void;
}

const TrackerList: React.FC<TrackerListProps> = ({ entries, projects, onRestart }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: TimeEntry[] } = {};
    entries.forEach(entry => {
      const dateKey = getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    // Sort keys descending (newest first)
    return Object.keys(groups).sort((a, b) => {
      const dateA = parseDateKeyToLocalDate(a)?.getTime() ?? 0;
      const dateB = parseDateKeyToLocalDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    }).map(date => ({
      date,
      entries: groups[date]
    }));
  }, [entries]);

  // Format date header (e.g., "Today", "Yesterday", "Sat, Jan 17")
  const formatDateHeader = (dateStr: string) => {
    const date = parseDateKeyToLocalDate(dateStr) ?? new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset times for comparison
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const y = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (d.getTime() === t.getTime()) return "Today";
    if (d.getTime() === y.getTime()) return "Yesterday";
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Calculate total duration for a group
  const formatTotalDuration = (entries: TimeEntry[]) => {
    const totalSeconds = entries.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleManualLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const dateStr = formData.get('date') as string; // YYYY-MM-DD
    const startStr = formData.get('startTime') as string; // HH:MM
    const endStr = formData.get('endTime') as string; // HH:MM

    // Parse as local time and convert to proper Date objects
    // This handles the user's local timezone correctly
    const [year, month, day] = dateStr.split('-').map(Number);
    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);

    const start = new Date(year, month - 1, day, startHour, startMin, 0);
    const end = new Date(year, month - 1, day, endHour, endMin, 0);
    
    startTransition(async () => {
      const result = await logManualTimeEntry({
        projectId: formData.get('projectId') === 'none' ? null : (formData.get('projectId') as string),
        description: formData.get('description') as string,
        startTime: start,
        endTime: end,
        isBillable: formData.get('billable') === 'on',
      });

      if (result.success) {
        setIsDialogOpen(false);
      } else {
        alert(result.error || 'Failed to log entry');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
              <Plus size={14} className="mr-2" />
              Log Time Manually
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Log Time Manually</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleManualLog} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">What did you work on?</Label>
                <Input id="description" name="description" placeholder="Short description..." required disabled={isPending} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Select name="projectId" disabled={isPending} defaultValue="none">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required disabled={isPending} />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Checkbox id="billable" name="billable" defaultChecked />
                  <Label htmlFor="billable">Billable</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" name="startTime" type="time" required disabled={isPending} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" name="endTime" type="time" required disabled={isPending} />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Save Entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groupedEntries.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          No time entries yet.
        </div>
      ) : (
        groupedEntries.map((group) => (
          <div key={group.date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Date Header */}
            <div className="flex items-end justify-between px-1 mb-2">
               <span className="text-sm font-medium text-slate-500">{formatDateHeader(group.date)}</span>
               <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total:</span>
                  <span className="text-sm font-bold text-slate-600 font-mono">{formatTotalDuration(group.entries)}</span>
               </div>
            </div>

            {/* List Card */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
               {group.entries.map((entry) => {
                   const project = projects.find(p => p.id === entry.projectId);
                   return (
                      <TimeEntryRow 
                          key={entry.id} 
                          entry={entry} 
                          project={project}
                          onRestart={onRestart}
                      />
                   );
               })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TrackerList;
