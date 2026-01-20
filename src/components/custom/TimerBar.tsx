import React, { useState } from 'react';
import { Play, Square, ChevronDown } from 'lucide-react';
import { Project } from '@/types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface TimerBarProps {
  projects: Project[];
  activeProject: Project | null;
  isRunning: boolean;
  onStart: (projectId: string | null, description: string) => Promise<void>;
  onStop: () => Promise<void>;
  elapsedSeconds: number;
}

const TimerBar: React.FC<TimerBarProps> = ({ 
  projects,
  activeProject, 
  isRunning, 
  onStart,
  onStop,
  elapsedSeconds 
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'none'>('none');

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const pId = selectedProjectId === 'none' ? null : selectedProjectId;
    onStart(pId, taskInput);
    setTaskInput('');
  };

  if (isRunning) {
    return (
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-indigo-100 px-6 py-3 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-medium text-indigo-600 tracking-tight">
              {formatTime(elapsedSeconds)}
            </span>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col justify-center">
               <span className="text-sm font-medium text-slate-900">{activeProject?.name ? 'Tracking' : 'Untitled Task'}</span>
               {activeProject && (
                 <span className="text-xs text-slate-500 flex items-center gap-1">
                   <span className={`w-1.5 h-1.5 rounded-full bg-indigo-500`}></span>
                   {activeProject.name}
                 </span>
               )}
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={onStop}
                className="flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 hover:scale-105 transition-all active:scale-95 border border-rose-200"
                title="Stop Timer"
             >
               <Square size={18} fill="currentColor" />
             </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-600 animate-[pulse_2s_infinite]" style={{ width: '100%' }}></div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center gap-2">
        <div className="relative flex-1 flex items-center gap-2">
            <input 
                type="text" 
                placeholder="What are you working on?" 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-md py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStart();
                }}
            />
            
            <div className="w-48">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-[42px] bg-white border-slate-200 text-xs">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.color.replace('text-', 'bg-')}`}></span>
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
        
        <button 
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:translate-y-px"
        >
            <Play size={16} fill="currentColor" />
            Start
        </button>
      </div>
    </div>
  );
};

export default TimerBar;
