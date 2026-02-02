import React from 'react';
import { tailwindToHex } from '@/lib/colors';
import { 
  LayoutDashboard, 
  Clock, 
  Briefcase, 
  FileBarChart, 
  Settings,
  Users,
  CalendarDays
} from 'lucide-react';
import { Project } from '@/types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  projects: Project[];
  onRetainerClick?: (projectId: string) => void;
  highlightedProjectId?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, projects, onRetainerClick, highlightedProjectId }) => {
  return (
    <aside className="w-[250px] bg-slate-50 border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-transparent">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">Chronos</span>
        </div>
      </div>

      {/* Main Nav */}
      <div className="px-2 py-4 space-y-0.5">
        <NavItem 
            icon={<LayoutDashboard size={16} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => onViewChange('dashboard')}
        />
        <NavItem 
            icon={<CalendarDays size={16} />} 
            label="Timesheet" 
            active={currentView === 'timesheet'}
            onClick={() => onViewChange('timesheet')}
        />
        <NavItem 
            icon={<Clock size={16} />} 
            label="Tracker" 
            active={currentView === 'tracker'}
            onClick={() => onViewChange('tracker')}
        />
        <NavItem 
            icon={<Briefcase size={16} />} 
            label="Projects" 
            active={currentView === 'projects'}
            onClick={() => onViewChange('projects')}
        />
        <NavItem 
            icon={<Users size={16} />} 
            label="Clients" 
            active={currentView === 'clients'}
            onClick={() => onViewChange('clients')}
        />
        <NavItem 
            icon={<FileBarChart size={16} />} 
            label="Reports" 
            active={currentView === 'reports'}
            onClick={() => onViewChange('reports')}
        />
      </div>

      {/* Projects Section */}
      <div className="mt-4 px-4 mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Retainers</h3>
      </div>
      <div className="px-2 space-y-0.5 flex-1 overflow-y-auto">
        {projects.slice(0, 3).map((project) => {
          const isHighlighted = highlightedProjectId === project.id;
          return (
            <button 
              key={project.id}
              type="button"
              onClick={() => onRetainerClick?.(project.id)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-colors text-left group ${isHighlighted ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tailwindToHex(project.color || 'text-slate-600') }}
              ></span>
              <span className="truncate">{project.name}</span>
            </button>
          );
        })}
      </div>

      {/* Footer / User */}
      <div className="p-3 border-t border-slate-200">
        <button className="flex items-center gap-3 w-full p-2 hover:bg-white rounded-md border border-transparent hover:border-slate-200 hover:shadow-sm transition-all text-left">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-medium text-slate-600">
                JD
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">John Doe</p>
                <p className="text-[10px] text-slate-500 truncate">john@design.co</p>
            </div>
            <Settings size={14} className="text-slate-400" />
        </button>
      </div>
    </aside>
  );
};
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-all duration-200
        ${active 
          ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-medium' 
          : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
        }
      `}
    >
      <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
      {label}
    </button>
  );
};

export default Sidebar;
