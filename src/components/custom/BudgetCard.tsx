import React from 'react';
import { Project } from '@/types';
import { AlertCircle } from 'lucide-react';

interface BudgetCardProps {
  project: Project;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ project }) => {
  const percentage = (project.hoursUsed / project.hoursTotal) * 100;
  
  // Color Logic
  let barColor = 'bg-emerald-500';
  let statusColor = 'text-emerald-600';
  let badge = null;

  if (percentage > 100) {
    barColor = 'bg-rose-600';
    statusColor = 'text-rose-600';
    badge = (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
            <AlertCircle size={10} />
            OVERAGE
        </span>
    );
  } else if (percentage >= 80) {
    barColor = 'bg-amber-500';
    statusColor = 'text-amber-600';
  }

  // Calculate clamp for bar width so it doesn't break layout
  const barWidth = Math.min(percentage, 100);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 leading-tight">{project.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{project.client}</p>
        </div>
        {badge}
      </div>

      {/* Stats */}
      <div className="flex items-end justify-between mb-2">
        <span className={`text-2xl font-semibold tracking-tight ${statusColor}`}>
          {percentage.toFixed(0)}%
        </span>
        <span className="text-xs font-medium text-slate-400">
           <span className="text-slate-700">{project.hoursUsed}</span> / {project.hoursTotal} hrs
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
        {/* Progress Bar Fill */}
        <div 
            className={`h-full ${barColor} transition-all duration-500 ease-out`} 
            style={{ width: `${barWidth}%` }}
        ></div>
        
        {/* Overage Marker Line (if overage, styling logic handles color, but conceptually visual indicator) */}
        {percentage > 100 && (
            <div className="absolute top-0 bottom-0 right-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDNoMXYxHTF6TTMgMWgxdjFIM3oiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-50"></div>
        )}
      </div>
      
    </div>
  );
};

export default BudgetCard;