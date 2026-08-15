import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimeEntry, Project, Client, Tag } from '@/types';
import TimeEntryRow from './TimeEntryRow';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLocalDateKey, parseDateKeyToLocalDate } from '@/lib/time';
import { UNASSIGNED_PROJECT_KEY } from '@/lib/tracking';
import { ManualTimeEntryForm } from './ManualTimeEntryForm';
import { LiveDayTotal } from './LiveElapsed';
import type { TrackerFilterState } from './TrackerPageClient';

interface TrackerListProps {
  entries: TimeEntry[];
  projects: Project[];
  clients: Client[];
  tags: Tag[];
  onRestart: (entry: TimeEntry) => void;
  totalCount: number;
  page: number;
  pageSize: number;
  filters: TrackerFilterState;
}

const TrackerList: React.FC<TrackerListProps> = ({
  entries,
  projects,
  clients,
  tags,
  onRestart,
  totalCount,
  page,
  pageSize,
  filters,
}) => {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q);

  const pushFilters = (next: Partial<TrackerFilterState> & { page?: number }) => {
    const params = new URLSearchParams();
    const q = next.q ?? filters.q;
    const project = next.project ?? filters.project;
    const client = next.client ?? filters.client;
    const billable = next.billable ?? filters.billable;
    const nextPage = next.page ?? 1;
    if (q) params.set("q", q);
    if (project) params.set("project", project);
    if (client) params.set("client", client);
    if (billable) params.set("billable", billable);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    router.push(query ? `/tracker?${query}` : "/tracker");
  };

  const hasFilters = Boolean(filters.q || filters.project || filters.client || filters.billable);
  
  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: TimeEntry[] } = {};
    entries.forEach(entry => {
      const dateKey = getLocalDateKey(entry.startTimeISO || entry.startTime || entry.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    // Sort keys descending (newest first)
    return Object.keys(groups).sort((a, b) => {
      const dateA = parseDateKeyToLocalDate(a)?.getTime() ?? 0;
      const dateB = parseDateKeyToLocalDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    }).map(date => ({
      date,
      entries: groups[date]
    }));
  }, [entries]);

  // Format date header (e.g., "Today", "Yesterday", "Sat, Jan 17")
  const formatDateHeader = (dateStr: string) => {
    const date = parseDateKeyToLocalDate(dateStr) ?? new Date(dateStr);
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



  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            pushFilters({ q: searchText, page: 1 });
          }}
        >
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search descriptions"
            aria-label="Search descriptions"
          />
          <Select value={filters.project || "all"} onValueChange={(value) => pushFilters({ project: value === "all" ? "" : value })}>
            <SelectTrigger aria-label="Filter by project"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value={UNASSIGNED_PROJECT_KEY}>No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.client || "all"} onValueChange={(value) => pushFilters({ client: value === "all" ? "" : value })}>
            <SelectTrigger aria-label="Filter by client"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.billable || "all"} onValueChange={(value) => pushFilters({ billable: value === "all" ? "" : value })}>
            <SelectTrigger aria-label="Filter by billable"><SelectValue placeholder="Billable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entries</SelectItem>
              <SelectItem value="yes">Billable</SelectItem>
              <SelectItem value="no">Non-billable</SelectItem>
            </SelectContent>
          </Select>
        </form>
        <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {totalCount === 0
            ? hasFilters ? 'No matching entries.' : 'No time entries yet.'
            : `Showing ${Math.min((page - 1) * pageSize + 1, totalCount)}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
        </p>
        {totalCount > pageSize && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushFilters({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page * pageSize >= totalCount}
              onClick={() => pushFilters({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        )}
        </div>
      </div>
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
              <Plus size={14} className="mr-2" />
              Log Time Manually
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Log Time Manually</DialogTitle>
            </DialogHeader>
            <ManualTimeEntryForm
              projects={projects}
              clients={clients}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {groupedEntries.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 space-y-3">
          <p>{hasFilters ? "No matching entries." : "No time entries yet."}</p>
          <Button type="button" onClick={() => setIsDialogOpen(true)}>
            {hasFilters ? "Log time" : "Log your first entry"}
          </Button>
        </div>
      ) : (
        groupedEntries.map((group) => (
          <div key={group.date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Date Header */}
            <div className="flex items-end justify-between px-1 mb-2">
               <span className="text-sm font-medium text-slate-500">{formatDateHeader(group.date)}</span>
               <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total:</span>
                  <LiveDayTotal entries={group.entries} className="text-sm font-bold text-slate-600 font-mono" data-testid="day-total" />
               </div>
            </div>

            {/* List Card */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
               {group.entries.map((entry) => {
                   const project = projects.find(p => p.id === entry.projectId);
                   return (
                      <TimeEntryRow 
                          key={entry.id} 
                          entry={entry} 
                          project={project}
                          projects={projects}
                          availableTags={tags}
                          onRestart={onRestart}
                      />
                   );
               })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TrackerList;
