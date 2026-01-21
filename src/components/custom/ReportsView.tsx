"use client";

import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Printer,
  Share2,
  Download,
  FileText,
  CalendarDays,
} from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell as ReCell
} from 'recharts';
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ReportsViewProps {
  data: {
    summary: {
      totalSeconds: number;
      billableSeconds: number;
      totalAmount: number;
    };
    dailyActivity: {
      date: string;
      hours: number;
    }[];
    projectDistribution: {
      name: string;
      hours: number;
      color: string;
    }[];
  };
  projects?: { id: string; name: string }[];
  clients?: { id: string; name: string }[];
}

const COLOR_MAP: Record<string, string> = {
  'text-indigo-600': '#4f46e5',
  'text-purple-600': '#9333ea',
  'text-blue-600': '#2563eb',
  'text-emerald-600': '#059669',
  'text-rose-600': '#e11d48',
  'text-amber-600': '#d97706',
  'text-slate-600': '#475569',
  'text-cyan-600': '#0891b2',
  'text-pink-600': '#db2777',
  'text-teal-600': '#0d9488',
  'text-orange-600': '#ea580c',
  'text-lime-600': '#65a30d',
  'text-violet-600': '#7c3aed',
};

const getHexColor = (color: string) => {
  return COLOR_MAP[color] || COLOR_MAP[color.replace('text-', 'bg-')] || '#6366f1';
};

type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30Days' | 'thisYear' | 'custom';

const ReportsView: React.FC<ReportsViewProps> = ({ data, projects = [], clients = [] }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'weekly' | 'shared'>('summary');
  const [datePreset, setDatePreset] = useState<DatePreset>('last30Days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState<'project' | 'client' | 'day'>('project');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDateRangeLabel = () => {
    const labels: Record<DatePreset, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      last30Days: 'Last 30 Days',
      thisYear: 'This Year',
      custom: `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`,
    };
    return labels[datePreset];
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'today':
        setCustomDateRange({ from: now, to: now });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setCustomDateRange({ from: yesterday, to: yesterday });
        break;
      case 'thisWeek':
        setCustomDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(now, 7));
        setCustomDateRange({ from: lastWeekStart, to: endOfWeek(lastWeekStart) });
        break;
      case 'thisMonth':
        setCustomDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        setCustomDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case 'last30Days':
        setCustomDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'thisYear':
        setCustomDateRange({ from: startOfYear(now), to: now });
        break;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">

      {/* Top Header: Title, Tabs, Date Picker */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-semibold text-slate-800">Reports</h2>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="bg-slate-200/50">
              <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                Summary
              </TabsTrigger>
              <TabsTrigger value="detailed" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                Detailed
              </TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                Weekly
              </TabsTrigger>
              <TabsTrigger value="shared" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                Shared
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date Range Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10">
              <Calendar size={16} className="text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 font-medium">{getDateRangeLabel()}</span>
              <ChevronDown size={14} className="ml-2 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handlePresetChange('today')}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePresetChange('yesterday')}>Yesterday</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlePresetChange('thisWeek')}>This Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePresetChange('lastWeek')}>Last Week</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlePresetChange('thisMonth')}>This Month</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePresetChange('lastMonth')}>Last Month</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePresetChange('last30Days')}>Last 30 Days</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlePresetChange('thisYear')}>This Year</DropdownMenuItem>
            <DropdownMenuSeparator />
            <Popover>
              <PopoverTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                  <CalendarDays size={14} className="mr-2" />
                  Custom Range...
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomDateRange({ from: range.from, to: range.to });
                      setDatePreset('custom');
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase mr-2 tracking-wide">Filter</span>

          {/* Client Filter */}
          <Select value={selectedClient || 'all'} onValueChange={(v) => setSelectedClient(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Project Filter */}
          <Select value={selectedProject || 'all'} onValueChange={(v) => setSelectedProject(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(selectedProject || selectedClient) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-rose-500 h-8"
              onClick={() => {
                setSelectedProject(null);
                setSelectedClient(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <Button className="bg-sky-400 hover:bg-sky-500 text-white text-sm font-semibold uppercase tracking-wide shadow-sm h-9">
          Apply Filter
        </Button>
      </div>

      {/* Summary Tab Content */}
      {activeTab === 'summary' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

          {/* Summary Strip */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col xl:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8 w-full xl:w-auto justify-between xl:justify-start">
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Total Time</div>
                <div className="text-2xl font-mono font-bold text-slate-800">{formatDuration(data.summary.totalSeconds)}</div>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden xl:block"></div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Billable Time</div>
                <div className="text-2xl font-mono font-bold text-slate-800">{formatDuration(data.summary.billableSeconds)}</div>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden xl:block"></div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Amount</div>
                <div className="text-2xl font-mono font-bold text-slate-800 flex items-baseline">
                  <span className="text-sm text-slate-500 mr-1">USD</span>
                  {data.summary.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ActionIcon icon={<FileText size={16} />} label="Invoice" />
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <ActionIcon icon={<Download size={16} />} label="Export" />
              <ActionIcon icon={<Printer size={16} />} />
              <ActionIcon icon={<Share2 size={16} />} />
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="p-6 h-64 border-b border-slate-200 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={data.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          {/* Group By Controls */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Group by:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bottom Split View: List vs Donut */}
          <div className="flex flex-col lg:flex-row min-h-[400px]">
            {/* Left: Data List */}
            <div className="flex-1 overflow-y-auto border-r border-slate-200">
              {data.projectDistribution.map((item, idx) => (
                <ReportRow
                  key={idx}
                  label={item.name}
                  sublabel="Project"
                  time={`${item.hours.toFixed(2)}h`}
                  amount="0.00"
                  color={item.color.replace('text-', 'bg-')}
                />
              ))}
              {data.projectDistribution.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">No activity in this period.</div>
              )}
            </div>

            {/* Right: Donut Chart */}
            <div className="w-full lg:w-[400px] bg-white flex items-center justify-center p-8">
              {data.projectDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={data.projectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="hours"
                    >
                      {data.projectDistribution.map((entry, index) => (
                        <ReCell key={`cell-${index}`} fill={getHexColor(entry.color)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm italic">No data to display</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Tab Content */}
      {activeTab === 'detailed' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center text-slate-400">
          <FileText size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">Detailed Report</h3>
          <p className="text-sm">Shows individual time entries with full details.</p>
          <p className="text-xs mt-4 text-slate-400">Coming soon...</p>
        </div>
      )}

      {/* Weekly Tab Content */}
      {activeTab === 'weekly' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center text-slate-400">
          <CalendarDays size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">Weekly Report</h3>
          <p className="text-sm">Shows weekly breakdown of hours by day.</p>
          <p className="text-xs mt-4 text-slate-400">Coming soon...</p>
        </div>
      )}

      {/* Shared Tab Content */}
      {activeTab === 'shared' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center text-slate-400">
          <Share2 size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">Shared Reports</h3>
          <p className="text-sm">Generate shareable links to reports.</p>
          <p className="text-xs mt-4 text-slate-400">Coming soon...</p>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

const ActionIcon: React.FC<{ icon: React.ReactNode, label?: string }> = ({ icon, label }) => (
  <button className="flex items-center gap-2 px-2 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors text-xs font-medium">
    {icon}
    {label}
  </button>
);

const ReportRow: React.FC<{
  label: string,
  sublabel: string,
  time: string,
  amount: string,
  color: string,
}> = ({ label, sublabel, time, amount, color }) => (
  <div className="border-b border-slate-100 bg-white">
    <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 cursor-pointer group transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <div>
          <div className="text-sm font-medium text-indigo-600 group-hover:underline decoration-slate-300 underline-offset-2 transition-all">{label}</div>
          <div className="text-xs text-slate-500">- {sublabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-8 text-right">
        <div className="font-mono text-sm font-medium text-slate-800">{time}</div>
        <div className="font-mono text-sm text-slate-400 w-20">USD<span className="text-slate-700 ml-1">{amount}</span></div>
      </div>
    </div>
  </div>
);

export default ReportsView;
