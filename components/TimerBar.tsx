import React, { useState, useEffect } from 'react';
import { Play, Square, ChevronDown } from 'lucide-react';
import { Project } from '../types';

interface TimerBarProps {
  activeProject: Project | null;
  isRunning: boolean;
  setIsRunning: (val: boolean) => void;
  elapsedSeconds: number;
}

const TimerBar: React.FC<TimerBarProps> = ({ 
  activeProject, 
  isRunning, 
  setIsRunning,
  elapsedSeconds 
}) => {
  const [taskInput, setTaskInput] = useState('');

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isRunning) {
    return (
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-indigo-100 px-6 py-3 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Left: Timer */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-medium text-indigo-600 tracking-tight">
              {formatTime(elapsedSeconds)}
            </span>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col justify-center">
               <span className="text-sm font-medium text-slate-900">{taskInput || 'Untitled Task'}</span>
               {activeProject && (
                 <span className="text-xs text-slate-500 flex items-center gap-1">
                   <span className={`w-1.5 h-1.5 rounded-full bg-indigo-500`}></span>
                   {activeProject.name}
                 </span>
               )}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsRunning(false)}
                className="flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 hover:scale-105 transition-all active:scale-95 border border-rose-200"
                title="Stop Timer"
             >
               <Square size={18} fill="currentColor" />
             </button>
          </div>
        </div>
        {/* Progress Indication Line */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-600 animate-[pulse_2s_infinite]" style={{ width: '100%' }}></div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center gap-2">
        <div className="relative flex-1 group">
            <input 
                type="text" 
                placeholder="What are you working on?" 
                className="w-full bg-slate-50 border border-slate-200 rounded-md py-2.5 pl-4 pr-32 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsRunning(true);
                }}
            />
            <div className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
                <button className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-sm">
                   <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                   Website
                </button>
            </div>
        </div>
        
        <button 
            onClick={() => setIsRunning(true)}
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