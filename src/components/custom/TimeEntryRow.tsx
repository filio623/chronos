import React, { useTransition } from 'react';
import { TimeEntry, Project } from '@/types';
import { Play, DollarSign, Tag, MoreVertical, Calendar, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTimeEntry } from '@/server/actions/time-entries';

interface TimeEntryRowProps {
  entry: TimeEntry;
  project?: Project;
  onRestart: (entry: TimeEntry) => void;
}

const TimeEntryRow: React.FC<TimeEntryRowProps> = ({ entry, project, onRestart }) => {
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      startTransition(async () => {
        await deleteTimeEntry(entry.id);
      });
    }
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
        
        {/* Tags (Visual Only) */}
        <div className="hidden md:flex text-slate-300 hover:text-slate-500 cursor-pointer transition-colors">
            <Tag size={16} />
        </div>

        {/* Billable Status */}
        <div className={`flex items-center justify-center w-5 ${entry.isBillable ? 'text-blue-500' : 'text-slate-200'}`}>
            <DollarSign size={16} />
        </div>

        {/* Time Interval */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500 w-32 justify-end">
            <span>{entry.startTime}</span>
            <span>-</span>
            <span>{entry.endTime}</span>
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