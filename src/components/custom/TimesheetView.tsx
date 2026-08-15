"use client";

import React, { useState, useMemo } from 'react';
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
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatLocalTime, getLocalDateKey, parseDateKeyToLocalDate, type WeekStartsOn } from '@/lib/time';
import { UNASSIGNED_PROJECT_KEY } from '@/lib/tracking';
import { ManualTimeEntryForm } from './ManualTimeEntryForm';
import { useTimerSession } from './TimerSessionContext';
import { roundSeconds } from '@/lib/tracking';

interface TimesheetViewProps {
  projects: Project[];
  clients: Client[];
  entries: TimeEntry[];
  weekStart: string;
  weekStartsOn?: WeekStartsOn;
}

interface TimesheetRow {
  id: string;
  projectId: string;
  values: string[];
}

const TimesheetView: React.FC<TimesheetViewProps> = ({ projects, clients, entries, weekStart, weekStartsOn = 0 }) => {
  const currentWeekStart = parseDateKeyToLocalDate(weekStart) ?? startOfWeek(new Date(), { weekStartsOn });
  const router = useRouter();
  const { rounding } = useTimerSession();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isManualOpen, setIsManualOpen] = useState(false);

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
      const projectKey = entry.projectId || UNASSIGNED_PROJECT_KEY;
      const entryDateKey = getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date);
      const entryDate = parseDateKeyToLocalDate(entryDateKey);
      if (!entryDate) return;

      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn });
      if (entryDate < currentWeekStart || entryDate > weekEnd) return;

      const dayIndex = weekDays.findIndex(d => isSameDay(d.fullDate, entryDate));
      if (dayIndex === -1) return;

      if (!result.has(projectKey)) {
        result.set(projectKey, [0, 0, 0, 0, 0, 0, 0]);
      }

      const hours = result.get(projectKey)!;
      hours[dayIndex] += roundSeconds(entry.durationSeconds, rounding) / 3600;
    });

    return result;
  }, [entries, currentWeekStart, weekDays, weekStartsOn, rounding]);

  // Build rows from aggregated data
  const rows = useMemo(() => {
    const aggregatedRows: TimesheetRow[] = [];

    projectHoursByDay.forEach((hours, projectId) => {
      aggregatedRows.push({
        id: projectId,
        projectId,
        values: hours.map(h => h > 0 ? formatHours(h) : ''),
      });
    });

    // Add empty row if no rows
    if (aggregatedRows.length === 0) {
      aggregatedRows.push({ id: 'empty', projectId: '', values: ['', '', '', '', '', '', ''] });
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
    if (!projectId || projectId === UNASSIGNED_PROJECT_KEY) {
      return { name: 'No project', client: 'Unassigned', color: 'text-slate-400' };
    }
    const project = projects.find(p => p.id === projectId);
    if (!project) return { name: 'No project', client: 'Unassigned', color: 'text-slate-400' };
    return { name: project.name, client: project.client, color: project.color };
  };

  const jumpToWeek = (dateKey: string) => {
    router.push(`/timesheet?week=${dateKey}`);
  };

  const prevWeek = () => {
    const next = subWeeks(currentWeekStart, 1);
    router.push(`/timesheet?week=${format(next, 'yyyy-MM-dd')}`);
  };
  const nextWeek = () => {
    const next = addWeeks(currentWeekStart, 1);
    router.push(`/timesheet?week=${format(next, 'yyyy-MM-dd')}`);
  };

  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn }));

  const weekEntries = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn });
    return entries.filter(entry => {
      const entryDateKey = getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date);
      const entryDate = parseDateKeyToLocalDate(entryDateKey);
      if (!entryDate) return false;
      return entryDate >= currentWeekStart && entryDate <= weekEnd;
    });
  }, [entries, currentWeekStart, weekStartsOn]);

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
            <label className="flex items-center gap-2 px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-50 min-w-[160px]">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-sm text-slate-700 font-medium">
                {isCurrentWeek ? 'This week' : `${format(currentWeekStart, 'MMM d')} - ${format(addDays(currentWeekStart, 6), 'MMM d')}`}
              </span>
              <input
                type="date"
                aria-label="Jump to week"
                className="sr-only"
                onChange={(e) => {
                  if (e.target.value) jumpToWeek(e.target.value);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => router.push('/timesheet')}
              className="px-3 py-2 text-xs font-medium text-indigo-600 border-r border-slate-200 hover:bg-slate-50"
            >
              This week
            </button>
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
                    <div className="w-full text-center text-sm text-slate-600 tabular-nums">
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
          <ManualTimeEntryForm
            projects={projects}
            clients={clients}
            onSuccess={() => {
              setIsManualOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimesheetView;
