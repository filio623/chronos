import React, { useMemo } from 'react';
import { TimeEntry, Project } from '../types';
import TimeEntryRow from './TimeEntryRow';
import { MOCK_PROJECTS } from '../constants';

interface TrackerListProps {
  entries: TimeEntry[];
  onRestart: (entry: TimeEntry) => void;
}

const TrackerList: React.FC<TrackerListProps> = ({ entries, onRestart }) => {
  
  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: TimeEntry[] } = {};
    entries.forEach(entry => {
      if (!groups[entry.date]) {
        groups[entry.date] = [];
      }
      groups[entry.date].push(entry);
    });
    // Sort keys descending (newest first)
    return Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => ({
      date,
      entries: groups[date]
    }));
  }, [entries]);

  // Format date header (e.g., "Today", "Yesterday", "Sat, Jan 17")
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
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

  return (
    <div className="space-y-6">
      {groupedEntries.map((group) => (
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
                 const project = MOCK_PROJECTS.find(p => p.id === entry.projectId);
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
      ))}
    </div>
  );
};

export default TrackerList;