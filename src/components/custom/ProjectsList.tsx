import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  MoreVertical, 
  Star, 
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { MOCK_PROJECTS } from '@/constants';
import { Project } from '@/types';

const ProjectsList: React.FC = () => {
  const [filterText, setFilterText] = useState('');

  // Simple filtering logic
  const projects = MOCK_PROJECTS.filter(p => 
    p.name.toLowerCase().includes(filterText.toLowerCase()) || 
    p.client.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-800">Projects</h2>
        <button className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
          Create new project
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3">
        
        {/* Dropdowns Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
            <FilterButton label="Active" />
            <FilterButton label="Client" />
            <FilterButton label="Access" />
            <FilterButton label="Billing" />
        </div>

        {/* Divider for large screens */}
        <div className="hidden xl:block w-px bg-slate-200 my-1"></div>

        {/* Search & Apply */}
        <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Find by name" 
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-md outline-none transition-all placeholder:text-slate-400"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>
            <button className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-md hover:bg-slate-50 hover:text-indigo-600 transition-colors uppercase tracking-wide text-xs">
                Apply Filter
            </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-10 text-center">
                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                </th>
                <SortableHeader label="Name" />
                <SortableHeader label="Client" />
                <SortableHeader label="Tracked" />
                <SortableHeader label="Amount" />
                <SortableHeader label="Progress" />
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3 w-16 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
          
          {projects.length === 0 && (
             <div className="p-12 text-center text-slate-400">
                <p>No projects found matching your criteria.</p>
             </div>
          )}
        </div>
        
        {/* Footer / Pagination Mock */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
            <span className="text-xs text-slate-500">Showing {projects.length} projects</span>
        </div>
      </div>

    </div>
  );
};

const FilterButton: React.FC<{label: string}> = ({ label }) => (
    <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap">
        {label}
        <ChevronDown size={14} className="text-slate-400" />
    </button>
);

const SortableHeader: React.FC<{label: string}> = ({ label }) => (
    <th className="px-4 py-3 cursor-pointer group hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-1">
            {label}
            <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
        </div>
    </th>
);

const ProjectRow: React.FC<{project: Project}> = ({ project }) => {
    return (
        <tr className="group hover:bg-slate-50/80 transition-colors text-sm text-slate-700">
            <td className="px-4 py-3 text-center">
                 <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
            </td>
            <td className="px-4 py-3 font-medium text-slate-900">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${project.color.replace('text-', 'bg-')}`}></span>
                    {project.name}
                </div>
            </td>
            <td className="px-4 py-3">{project.client}</td>
            <td className="px-4 py-3 font-mono text-slate-600">{project.hoursUsed.toFixed(2)}h</td>
            <td className="px-4 py-3 text-slate-500">{project.amount || '-'}</td>
            <td className="px-4 py-3">
                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${project.hoursUsed > project.hoursTotal ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, (project.hoursUsed / project.hoursTotal) * 100)}%` }}
                    ></div>
                </div>
            </td>
            <td className="px-4 py-3 text-slate-500">{project.access || 'Public'}</td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className={`${project.isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>
                        <Star size={16} fill={project.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button className="text-slate-300 hover:text-slate-600">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default ProjectsList;