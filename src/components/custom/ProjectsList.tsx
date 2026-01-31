"use client";

import React, { useState, useTransition, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Star,
  ArrowUpDown,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Project, Client } from '@/types';
import { createProject, deleteProject, updateProject, toggleFavorite, archiveProject, unarchiveProject } from '@/server/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ColorPicker, { InlineColorPicker } from './ColorPicker';

interface ProjectsListProps {
  projects: Project[];
  clients: Client[];
  totalCount?: number;
}

type SortColumn = 'name' | 'client' | 'hoursUsed' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const ProjectsList: React.FC<ProjectsListProps> = ({ projects, clients, totalCount = projects.length }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filterText, setFilterText] = useState(searchParams.get('search') || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newProjectColor, setNewProjectColor] = useState('text-indigo-600');
  const [newProjectBillable, setNewProjectBillable] = useState<'inherit' | 'billable' | 'non-billable'>('inherit');

  // Parse sort from URL
  const currentSort = (searchParams.get('sortBy') as SortColumn) || 'updatedAt';
  const currentOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 10;

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (filterText) {
        params.set('search', filterText);
      } else {
        params.delete('search');
      }
      params.delete('page'); // Reset to page 1 on search
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterText, router, pathname, searchParams]);

  const handleClientFilter = (clientId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (clientId) {
      params.set('client', clientId);
    } else {
      params.delete('client');
    }
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSort = (column: SortColumn) => {
    const params = new URLSearchParams(searchParams);
    if (currentSort === column) {
      // Toggle order
      params.set('sortOrder', currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'asc');
    }
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createProject(formData);
      if (result.success) {
        setIsDialogOpen(false);
        setNewProjectBillable('inherit');
      } else {
        alert(result.error || 'Failed to create project');
      }
    });
  };

  const currentClientId = searchParams.get('client');
  const totalPages = Math.ceil(totalCount / pageSize);

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
                <div className="flex items-center gap-2">
                  <ColorPicker value={newProjectColor} onChange={setNewProjectColor} disabled={isPending} />
                  <Input id="name" name="name" placeholder="e.g. Website Redesign" required disabled={isPending} className="flex-1" />
                </div>
                <input type="hidden" name="color" value={newProjectColor} />
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

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50"
                  disabled={isPending}
                />
                <p className="text-[10px] text-slate-500 italic">Optional project override</p>
              </div>

              <div className="space-y-2">
                <Label>Default Billable</Label>
                <Select value={newProjectBillable} onValueChange={(value) => setNewProjectBillable(value as typeof newProjectBillable)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Inherit from client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit from client</SelectItem>
                    <SelectItem value="billable">Billable</SelectItem>
                    <SelectItem value="non-billable">Non-billable</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="defaultBillable" value={newProjectBillable} />
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${currentClientId ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}>
                Client {currentClientId ? '(1)' : ''}
                <ChevronDown size={14} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => handleClientFilter(null)}>
                All Clients
              </DropdownMenuItem>
              {clients.map(client => (
                <DropdownMenuItem key={client.id} onClick={() => handleClientFilter(client.id)}>
                  {client.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <FilterButton label="Access" />
          <FilterButton label="Billing" />

          {/* Clear Filters */}
          {(filterText || currentClientId) && (
            <button
              onClick={() => {
                setFilterText('');
                router.replace(pathname);
              }}
              className="flex items-center gap-1 text-xs text-rose-500 hover:underline px-2"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Divider for large screens */}
        <div className="hidden xl:block w-px bg-slate-200 my-1"></div>

        {/* Search & Apply */}
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Find by name..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-md outline-none transition-all placeholder:text-slate-400"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
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
                <SortableHeader
                  label="Name"
                  column="name"
                  currentSort={currentSort}
                  currentOrder={currentOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Client"
                  column="client"
                  currentSort={currentSort}
                  currentOrder={currentOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Tracked"
                  column="hoursUsed"
                  currentSort={currentSort}
                  currentOrder={currentOrder}
                  onSort={handleSort}
                />
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Progress</th>
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

        {/* Footer / Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} projects
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const FilterButton: React.FC<{ label: string }> = ({ label }) => (
  <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap">
    {label}
    <ChevronDown size={14} className="text-slate-400" />
  </button>
);

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentSort: SortColumn;
  currentOrder: SortOrder;
  onSort: (column: SortColumn) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ label, column, currentSort, currentOrder, onSort }) => {
  const isActive = currentSort === column;

  return (
    <th
      className="px-4 py-3 cursor-pointer group hover:bg-slate-100 transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === 'asc' ? (
            <ChevronUp size={12} className="text-indigo-600" />
          ) : (
            <ChevronDown size={12} className="text-indigo-600" />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
        )}
      </div>
    </th>
  );
};

interface ProjectRowProps {
  project: Project;
  clients: Client[];
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, clients }) => {
  const [isPending, startTransition] = useTransition();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(project.hoursTotal.toString());
  const [editColor, setEditColor] = useState(project.color);
  const [editDefaultBillable, setEditDefaultBillable] = useState<'inherit' | 'billable' | 'non-billable'>(
    project.defaultBillable === null || project.defaultBillable === undefined
      ? 'inherit'
      : project.defaultBillable
        ? 'billable'
        : 'non-billable'
  );

  const handleBudgetSave = async () => {
    const newBudget = parseFloat(budgetValue) || 0;
    if (newBudget === project.hoursTotal) {
      setIsEditingBudget(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', project.name);
    formData.append('budgetLimit', newBudget.toString());
    if (project.clientId) {
      formData.append('clientId', project.clientId);
    }
    if (project.hourlyRate !== null && project.hourlyRate !== undefined) {
      formData.append('hourlyRate', project.hourlyRate.toString());
    }

    startTransition(async () => {
      const result = await updateProject(project.id, formData);
      if (result.success) {
        setIsEditingBudget(false);
      } else {
        alert(result.error || 'Failed to update budget');
      }
    });
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBudgetSave();
    } else if (e.key === 'Escape') {
      setBudgetValue(project.hoursTotal.toString());
      setIsEditingBudget(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete project "${project.name}"? This will also delete all associated time entries.`)) {
      startTransition(async () => {
        await deleteProject(project.id);
      });
    }
  };

  const handleToggleFavorite = () => {
    startTransition(async () => {
      await toggleFavorite(project.id);
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await archiveProject(project.id);
    });
  };

  const handleUnarchive = () => {
    startTransition(async () => {
      await unarchiveProject(project.id);
    });
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

  const handleColorChange = async (newColor: string) => {
    setEditColor(newColor);
    const formData = new FormData();
    formData.append('name', project.name);
    formData.append('color', newColor);
    if (project.clientId) {
      formData.append('clientId', project.clientId);
    }
    formData.append('budgetLimit', project.hoursTotal.toString());
    if (project.hourlyRate !== null && project.hourlyRate !== undefined) {
      formData.append('hourlyRate', project.hourlyRate.toString());
    }

    startTransition(async () => {
      await updateProject(project.id, formData);
    });
  };

  const client = clients.find(c => c.id === project.clientId);
  const effectiveRate = project.hourlyRate ?? client?.defaultRate ?? null;

  return (
    <tr className={`group hover:bg-slate-50/80 transition-colors text-sm text-slate-700 ${isPending ? 'opacity-50 grayscale' : ''}`}>
      <td className="px-4 py-3 text-center">
        <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
      </td>
      <td className="px-4 py-3 font-medium text-slate-900">
        <div className="flex items-center gap-2">
          <InlineColorPicker value={project.color} onChange={handleColorChange} disabled={isPending} />
          {project.name}
        </div>
      </td>
      <td className="px-4 py-3">{project.client}</td>
      <td className="px-4 py-3 font-mono text-slate-600">{project.hoursUsed.toFixed(2)}h</td>
      <td className="px-4 py-3 text-slate-500">
        {effectiveRate !== null && effectiveRate !== undefined ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">${effectiveRate}/hr</span>
            {project.hourlyRate === null || project.hourlyRate === undefined ? (
              <span className="text-[10px] uppercase text-slate-400">client</span>
            ) : null}
          </div>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-3">
        {isEditingBudget ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              onBlur={handleBudgetSave}
              onKeyDown={handleBudgetKeyDown}
              className="w-16 px-1.5 py-0.5 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
              disabled={isPending}
            />
            <span className="text-xs text-slate-400">h</span>
          </div>
        ) : (
          <div
            className="group/progress flex items-center gap-2 cursor-pointer"
            onClick={() => setIsEditingBudget(true)}
            title="Click to edit budget"
          >
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${project.hoursUsed > project.hoursTotal && project.hoursTotal > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${project.hoursTotal > 0 ? Math.min(100, (project.hoursUsed / project.hoursTotal) * 100) : 0}%` }}
              ></div>
            </div>
            <span className="text-xs text-slate-500 group-hover/progress:text-indigo-600">
              {project.hoursTotal > 0 ? `${project.hoursTotal}h` : 'Set'}
            </span>
            <Pencil size={10} className="text-slate-300 opacity-0 group-hover/progress:opacity-100" />
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-slate-500">{project.access || 'Public'}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleFavorite}
            className={`${project.isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
            disabled={isPending}
          >
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
              {project.isArchived ? (
                <DropdownMenuItem onClick={handleUnarchive} className="cursor-pointer">
                  <ArchiveRestore size={14} className="mr-2" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive} className="cursor-pointer">
                  <Archive size={14} className="mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer">
                <Trash2 size={14} className="mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (open) {
                setEditColor(project.color);
                setEditDefaultBillable(
                  project.defaultBillable === null || project.defaultBillable === undefined
                    ? 'inherit'
                    : project.defaultBillable
                      ? 'billable'
                      : 'non-billable'
                );
              }
            }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProject} className="space-y-4 py-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Project Name</Label>
                  <div className="flex items-center gap-2">
                    <ColorPicker value={editColor} onChange={setEditColor} disabled={isPending} />
                    <Input id="edit-name" name="name" defaultValue={project.name} required disabled={isPending} className="flex-1" />
                  </div>
                  <input type="hidden" name="color" value={editColor} />
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

              <div className="space-y-2">
                <Label htmlFor="edit-hourlyRate">Hourly Rate</Label>
                <Input
                  id="edit-hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50"
                  defaultValue={project.hourlyRate ?? ''}
                  disabled={isPending}
                />
                <p className="text-[10px] text-slate-500 italic">Optional project override</p>
              </div>

              <div className="space-y-2">
                <Label>Default Billable</Label>
                <Select value={editDefaultBillable} onValueChange={(value) => setEditDefaultBillable(value as typeof editDefaultBillable)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Inherit from client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Inherit from client</SelectItem>
                      <SelectItem value="billable">Billable</SelectItem>
                      <SelectItem value="non-billable">Non-billable</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="defaultBillable" value={editDefaultBillable} />
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
