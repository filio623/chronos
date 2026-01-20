import React, { useState, useTransition } from 'react';
import { 
  Search, 
  ChevronDown, 
  MoreVertical, 
  Star, 
  Filter,
  ArrowUpDown,
  Plus,
  Loader2,
  Trash2,
  Pencil
} from 'lucide-react';
import { Project, Client } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createProject, deleteProject, updateProject } from '@/server/actions/projects';

interface ProjectsListProps {
  projects: Project[];
  clients: Client[];
}

const ProjectsList: React.FC<ProjectsListProps> = ({ projects: initialProjects, clients }) => {
  const [filterText, setFilterText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const projects = initialProjects.filter(p => 
    p.name.toLowerCase().includes(filterText.toLowerCase()) || 
    p.client.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await createProject(formData);
      if (result.success) {
        setIsDialogOpen(false);
      } else {
        alert(result.error || 'Failed to create project');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-800">Projects</h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus size={16} className="mr-2" />
              Create new project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" name="name" placeholder="e.g. Website Redesign" required disabled={isPending} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientId">Client</Label>
                <Select name="clientId" disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetLimit">Budget Limit (Hours)</Label>
                <Input id="budgetLimit" name="budgetLimit" type="number" step="0.5" placeholder="e.g. 10" disabled={isPending} />
                <p className="text-[10px] text-slate-500 italic">Leave 0 for no limit</p>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Create Project
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <ProjectRow key={project.id} project={project} clients={clients} />
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

interface ProjectRowProps {
  project: Project;
  clients: Client[];
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, clients }) => {
    const [isPending, startTransition] = useTransition();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleDelete = async () => {
      if (confirm(`Are you sure you want to delete project "${project.name}"? This will also delete all associated time entries.`)) {
        startTransition(async () => {
          await deleteProject(project.id);
        });
      }
    };

    const handleEditProject = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      
      startTransition(async () => {
        const result = await updateProject(project.id, formData);
        if (result.success) {
          setIsEditDialogOpen(false);
        } else {
          alert(result.error || 'Failed to update project');
        }
      });
    };

    return (
        <tr className={`group hover:bg-slate-50/80 transition-colors text-sm text-slate-700 ${isPending ? 'opacity-50 grayscale' : ''}`}>
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
                        className={`h-full rounded-full ${project.hoursUsed > project.hoursTotal && project.hoursTotal > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${project.hoursTotal > 0 ? Math.min(100, (project.hoursUsed / project.hoursTotal) * 100) : 0}%` }}
                    ></div>
                </div>
            </td>
            <td className="px-4 py-3 text-slate-500">{project.access || 'Public'}</td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className={`${project.isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>
                        <Star size={16} fill={project.isFavorite ? "currentColor" : "none"} />
                    </button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-slate-300 hover:text-slate-600">
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer">
                          <Pencil size={14} className="mr-2" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer">
                          <Trash2 size={14} className="mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Project</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditProject} className="space-y-4 py-4 text-left">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Project Name</Label>
                            <Input id="edit-name" name="name" defaultValue={project.name} required disabled={isPending} />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="edit-clientId">Client</Label>
                            <Select name="clientId" defaultValue={project.clientId || "none"} disabled={isPending}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Client</SelectItem>
                                {clients.map(client => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-budgetLimit">Budget Limit (Hours)</Label>
                            <Input id="edit-budgetLimit" name="budgetLimit" type="number" step="0.5" defaultValue={project.hoursTotal} disabled={isPending} />
                            <p className="text-[10px] text-slate-500 italic">Leave 0 for no limit</p>
                          </div>

                          <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isPending}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                              {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                </div>
            </td>
        </tr>
    );
};

export default ProjectsList;