import React, { useEffect, useState, useTransition } from 'react';
import { TimeEntry, Project, Tag } from '@/types';
import { Play, DollarSign, MoreVertical, Calendar, Trash2, Loader2 } from 'lucide-react';
import { formatLocalTime } from '@/lib/time';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTimeEntry, updateTimeEntry } from '@/server/actions/time-entries';
import { assignTagsToEntry } from '@/server/actions/tags';
import TagPicker from './TagPicker';

interface TimeEntryRowProps {
  entry: TimeEntry;
  project?: Project;
  availableTags: Tag[];
  onRestart: (entry: TimeEntry) => void;
}

const TimeEntryRow: React.FC<TimeEntryRowProps> = ({ entry, project, availableTags, onRestart }) => {
  const [isPending, startTransition] = useTransition();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [localBillable, setLocalBillable] = useState(entry.isBillable);

  useEffect(() => {
    setSelectedTagIds(entry.tags?.map(t => t.id) || []);
  }, [entry.tags]);

  useEffect(() => {
    setLocalBillable(entry.isBillable);
  }, [entry.isBillable]);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      startTransition(async () => {
        await deleteTimeEntry(entry.id);
      });
    }
  };

  const handleBillableToggle = () => {
    const nextBillable = !localBillable;
    setLocalBillable(nextBillable);
    startTransition(async () => {
      await updateTimeEntry(entry.id, { isBillable: nextBillable });
    });
  };

  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    startTransition(async () => {
      await assignTagsToEntry(entry.id, tagIds);
    });
  };

  return (
    <div className={`group flex items-center justify-between py-3 px-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-all ${isPending ? 'opacity-50 grayscale' : ''}`}>
      
      {/* Left Side: Description & Project Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
        
        {/* Count Badge (Optional visual mimic) */}
        <div className="hidden sm:flex w-6 h-6 items-center justify-center rounded bg-slate-100 text-[10px] font-medium text-slate-500 border border-slate-200">
           1
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
          {/* Description */}
          <span className="text-sm font-medium text-slate-700 truncate cursor-pointer hover:underline">
            {entry.description || '(No description)'}
          </span>
          
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
            {entry.duration}
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
                <button className="p-1.5 text-slate-300 hover:text-slate-600 rounded-md transition-colors" disabled={isPending}>
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer">
                  <Trash2 size={14} className="mr-2" />
                  Delete Entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TimeEntryRow;
