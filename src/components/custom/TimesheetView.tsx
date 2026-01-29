"use client";

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Grid3X3
} from 'lucide-react';
import { Project, TimeEntry, Client } from '@/types';
import { logManualTimeEntry } from '@/server/actions/time-entries';
import { createProject } from '@/server/actions/projects';
import { createClient } from '@/server/actions/clients';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatLocalTime, getLocalDateKey, parseDateKeyToLocalDate } from '@/lib/time';

interface TimesheetViewProps {
  projects: Project[];
  clients: Client[];
  entries: TimeEntry[];
}

interface TimesheetRow {
  id: number;
  projectId: string;
  values: string[];
}

const TimesheetView: React.FC<TimesheetViewProps> = ({ projects, clients, entries }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [manualMode, setManualMode] = useState<'range' | 'duration'>('range');
  const [isPending, startTransition] = useTransition();

  const todayString = format(new Date(), 'yyyy-MM-dd');
  const [entryDate, setEntryDate] = useState(todayString);
  const [entryProjectId, setEntryProjectId] = useState<string>('none');
  const [entryClientId, setEntryClientId] = useState<string>('none');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryStartTime, setEntryStartTime] = useState('09:00');
  const [entryEndTime, setEntryEndTime] = useState('10:00');
  const [entryHours, setEntryHours] = useState('1');
  const [entryMinutes, setEntryMinutes] = useState('0');
  const [entryIsBillable, setEntryIsBillable] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClientId, setNewProjectClientId] = useState<string>('none');
  const [newClientName, setNewClientName] = useState('');
  const [newClientCurrency, setNewClientCurrency] = useState('USD');

  const selectedProject = entryProjectId !== 'none'
    ? projects.find(p => p.id === entryProjectId) || null
    : null;

  const isClientLocked = !!selectedProject?.clientId;

  useEffect(() => {
    if (selectedProject?.clientId) {
      setEntryClientId(selectedProject.clientId);
    }
  }, [selectedProject?.clientId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const formData = new FormData();
    formData.append('name', newProjectName);
    if (newProjectClientId !== 'none') {
      formData.append('clientId', newProjectClientId);
    }

    startTransition(async () => {
      const result = await createProject(formData);
      if (!result.success) {
        alert(result.error || 'Failed to create project');
        return;
      }
      if (result.data?.id) {
        setEntryProjectId(result.data.id);
        if (result.data.clientId) {
          setEntryClientId(result.data.clientId);
        }
      }
      setIsCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectClientId('none');
      router.refresh();
    });
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const formData = new FormData();
    formData.append('name', newClientName);
    formData.append('currency', newClientCurrency || 'USD');

    startTransition(async () => {
      const result = await createClient(formData);
      if (!result.success) {
        alert(result.error || 'Failed to create client');
        return;
      }
      if (result.data?.id) {
        setEntryClientId(result.data.id);
      }
      setIsCreateClientOpen(false);
      setNewClientName('');
      setNewClientCurrency('USD');
      router.refresh();
    });
  };

  // Generate days for current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekStart, i);
      return {
        day: format(date, 'EEE'),
        date: format(date, 'MMM d'),
        fullDate: date,
      };
    });
  }, [currentWeekStart]);

  // Aggregate entries by project and day
  const projectHoursByDay = useMemo(() => {
    const result = new Map<string, number[]>();

    entries.forEach(entry => {
      if (!entry.projectId) return;
      const entryDateKey = getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date);
      const entryDate = parseDateKeyToLocalDate(entryDateKey);
      if (!entryDate) return;

      // Check if entry is in current week
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
      if (entryDate < currentWeekStart || entryDate > weekEnd) return;

      // Find day index
      const dayIndex = weekDays.findIndex(d => isSameDay(d.fullDate, entryDate));
      if (dayIndex === -1) return;

      if (!result.has(entry.projectId)) {
        result.set(entry.projectId, [0, 0, 0, 0, 0, 0, 0]);
      }

      const hours = result.get(entry.projectId)!;
      hours[dayIndex] += entry.durationSeconds / 3600;
    });

    return result;
  }, [entries, currentWeekStart, weekDays]);

  // Build rows from aggregated data
  const rows = useMemo(() => {
    const aggregatedRows: TimesheetRow[] = [];

    projectHoursByDay.forEach((hours, projectId) => {
      // Generate a numeric id from the project string ID
      const numericId = projectId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
      aggregatedRows.push({
        id: numericId,
        projectId,
        values: hours.map(h => h > 0 ? formatHours(h) : ''),
      });
    });

    // Add empty row if no rows
    if (aggregatedRows.length === 0) {
      aggregatedRows.push({ id: Date.now(), projectId: '', values: ['', '', '', '', '', '', ''] });
    }

    return aggregatedRows;
  }, [projectHoursByDay]);

  // Format hours for display (e.g., 2.5 -> "2:30")
  function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  // Parse time string to minutes
  function parseTimeToMinutes(val: string): number {
    if (!val) return 0;
    const [h, m] = val.split(':').map(Number);
    if (isNaN(h)) return 0;
    return h * 60 + (m || 0);
  }

  // Helper to calculate row total
  const calculateRowTotal = (values: string[]) => {
    let totalMinutes = 0;
    values.forEach(val => {
      totalMinutes += parseTimeToMinutes(val);
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Helper for column totals
  const calculateColTotal = (colIndex: number) => {
    let totalMinutes = 0;
    rows.forEach(row => {
      totalMinutes += parseTimeToMinutes(row.values[colIndex]);
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    let totalMinutes = 0;
    rows.forEach(row => {
      row.values.forEach(val => {
        totalMinutes += parseTimeToMinutes(val);
      });
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getProjectName = (projectId: string): { name: string; client: string; color: string } | null => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;
    return { name: project.name, client: project.client, color: project.color };
  };

  const prevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const nextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 0 }));

  const weekEntries = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
    return entries.filter(entry => {
      const entryDateKey = getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date);
      const entryDate = parseDateKeyToLocalDate(entryDateKey);
      if (!entryDate) return false;
      return entryDate >= currentWeekStart && entryDate <= weekEnd;
    });
  }, [entries, currentWeekStart]);

  const buildDateTime = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const projectId = entryProjectId === 'none' ? null : entryProjectId;
    const clientId = entryClientId === 'none' ? null : entryClientId;

    let startTime: Date;
    let endTime: Date;

    if (manualMode === 'range') {
      if (!entryStartTime || !entryEndTime) {
        alert("Please enter a start and end time.");
        return;
      }
      startTime = buildDateTime(entryDate, entryStartTime);
      endTime = buildDateTime(entryDate, entryEndTime);
    } else {
      const hours = Math.max(0, parseInt(entryHours || '0', 10));
      const minutes = Math.max(0, parseInt(entryMinutes || '0', 10));
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes <= 0) {
        alert("Please enter a duration greater than 0.");
        return;
      }
      const start = entryStartTime ? buildDateTime(entryDate, entryStartTime) : buildDateTime(entryDate, '00:00');
      startTime = start;
      endTime = new Date(start.getTime() + totalMinutes * 60000);
    }

    if (endTime <= startTime) {
      alert("End time must be after start time.");
      return;
    }

    startTransition(async () => {
      const result = await logManualTimeEntry({
        projectId,
        clientId,
        description: entryDescription,
        startTime,
        endTime,
        isBillable: entryIsBillable,
      });

      if (!result.success) {
        alert(result.error || "Failed to log entry");
        return;
      }

      setIsManualOpen(false);
      setEntryDescription('');
      setEntryProjectId('none');
      setEntryClientId('none');
      setEntryStartTime('09:00');
      setEntryEndTime('10:00');
      setEntryHours('1');
      setEntryMinutes('0');
      setEntryIsBillable(true);
      router.refresh();
    });
  };


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">

      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-800">Timesheet</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Teammates Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-400 cursor-not-allowed shadow-sm"
              disabled
              title="Teammates (coming soon)"
            >
              Teammates
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-r border-slate-200 ${viewMode === 'list' ? 'text-indigo-600 bg-slate-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="List view"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`${viewMode === 'grid' ? 'p-2 text-indigo-600 bg-slate-50' : 'p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Grid view"
            >
              <Grid3X3 size={18} />
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center bg-white border border-slate-200 rounded shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-50 min-w-[160px]">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-sm text-slate-700 font-medium">
                {isCurrentWeek ? 'This week' : format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
              </span>
            </div>
            <button
              onClick={prevWeek}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border-r border-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextWeek}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Entry Button */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setIsManualOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus size={16} className="mr-2" />
          Add manual entry
        </Button>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-100">
            {weekEntries.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm">
                No entries this week.
              </div>
            )}
            {weekEntries.map((entry) => {
              const project = projects.find(p => p.id === entry.projectId);
              const client = entry.clientId
                ? clients.find(c => c.id === entry.clientId)
                : project?.clientId ? clients.find(c => c.id === project.clientId) : null;
              return (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {entry.description || 'Manual entry'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(parseDateKeyToLocalDate(getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date)) ?? new Date(entry.date), 'EEE, MMM d')} · {project?.name || client?.name || 'No project'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{formatLocalTime(entry.startTime)} – {formatLocalTime(entry.endTime)}</span>
                    <span className="font-mono text-slate-700">{entry.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-medium text-slate-500">
            Weekly summary
          </div>

        {/* Header Row */}
        <div className="bg-slate-100 border-b border-slate-200 flex text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="flex-1 px-4 py-3 min-w-[200px]">Projects</div>
          {weekDays.map((d, i) => (
            <div key={i} className="w-24 px-2 py-3 text-center border-l border-slate-200">
              <div className="text-[10px] text-slate-400">{d.day}</div>
              <div>{d.date}</div>
            </div>
          ))}
          <div className="w-24 px-2 py-3 text-center border-l border-slate-200 bg-slate-50">Total</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {rows.map((row) => {
            const projectInfo = row.projectId ? getProjectName(row.projectId) : null;
            return (
              <div key={row.id} className="flex items-center hover:bg-slate-50 transition-colors">
                {/* Project Cell */}
                <div className="flex-1 px-4 py-3 min-w-[200px]">
                  {projectInfo ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className={`w-2 h-2 rounded-full ${projectInfo.color.replace('text-', 'bg-')}`}></span>
                      {projectInfo.name}
                      <span className="text-slate-400 font-normal">- {projectInfo.client}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">No project</span>
                  )}
                </div>

                {/* Value Cells (read-only) */}
                {row.values.map((val, idx) => (
                  <div key={idx} className="w-24 px-2 py-3 border-l border-slate-100 flex justify-center">
                    <div className="w-full text-center text-sm text-slate-600 bg-slate-50 rounded px-1 py-1">
                      {val || '0:00'}
                    </div>
                  </div>
                ))}

                {/* Row Total */}
                <div className="w-24 px-2 py-3 border-l border-slate-100 bg-slate-50/50 flex items-center justify-center">
                  <span className="text-sm font-mono font-medium text-slate-600">
                    {calculateRowTotal(row.values)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Totals */}
        <div className="bg-slate-50 border-t border-slate-200 flex items-center">
          <div className="flex-1 px-4 py-3 text-sm font-medium text-slate-500 text-right pr-6">Total:</div>
          {weekDays.map((_, idx) => (
            <div key={idx} className="w-24 px-2 py-3 text-center border-l border-slate-200 text-sm font-mono text-slate-600">
              {calculateColTotal(idx)}
            </div>
          ))}
          <div className="w-24 px-2 py-3 text-center border-l border-slate-200 text-sm font-mono font-bold text-slate-800">
            {calculateGrandTotal()}
          </div>
        </div>
      </div>
      )}


      {/* Manual Entry Dialog */}
      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add manual time entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry-date">Date</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-billable">Billable</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={entryIsBillable}
                    onCheckedChange={setEntryIsBillable}
                    id="entry-billable"
                  />
                  <span className="text-xs text-slate-500">
                    {entryIsBillable ? 'Billable' : 'Non-billable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                placeholder="What did you work on?"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select
                  value={entryProjectId}
                  onValueChange={(value) => {
                    if (value === 'create-new-project') {
                      setIsCreateProjectOpen(true);
                      return;
                    }
                    setEntryProjectId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    <SelectSeparator />
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="create-new-project">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Plus size={12} />
                        Create new project...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client (optional)</Label>
                <Select
                  value={entryClientId}
                  onValueChange={(value) => {
                    if (value === 'create-new-client') {
                      setIsCreateClientOpen(true);
                      return;
                    }
                    setEntryClientId(value);
                  }}
                  disabled={isClientLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isClientLocked ? 'Linked to project' : 'Select client'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    <SelectSeparator />
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="create-new-client">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Plus size={12} />
                        Create new client...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={manualMode === 'range' ? 'default' : 'outline'}
                onClick={() => setManualMode('range')}
              >
                Time range
              </Button>
              <Button
                type="button"
                variant={manualMode === 'duration' ? 'default' : 'outline'}
                onClick={() => setManualMode('duration')}
              >
                Duration
              </Button>
            </div>

            {manualMode === 'range' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={entryStartTime}
                    onChange={(e) => setEntryStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={entryEndTime}
                    onChange={(e) => setEntryEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    value={entryHours}
                    onChange={(e) => setEntryHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minutes</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={entryMinutes}
                    onChange={(e) => setEntryMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start time (optional)</Label>
                  <Input
                    type="time"
                    value={entryStartTime}
                    onChange={(e) => setEntryStartTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsManualOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-project-name">Project name</Label>
              <Input
                id="new-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Website Redesign"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select value={newProjectClientId} onValueChange={setNewProjectClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  <SelectSeparator />
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateClientOpen} onOpenChange={setIsCreateClientOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-client-name">Client name</Label>
              <Input
                id="new-client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="e.g. Acme Inc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-currency">Currency</Label>
              <Input
                id="new-client-currency"
                value={newClientCurrency}
                onChange={(e) => setNewClientCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateClientOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create client'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimesheetView;
