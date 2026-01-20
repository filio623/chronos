import React from 'react';
import { 
  Calendar, 
  ChevronDown, 
  Printer, 
  Share2, 
  Download, 
  FileText,
  CreditCard,
  ChevronRight
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
  Cell,
  Cell as ReCell
} from 'recharts';
import { format, parseISO } from 'date-fns';

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
}

const COLOR_MAP: Record<string, string> = {
  'text-indigo-600': '#4f46e5',
  'text-purple-600': '#9333ea',
  'text-blue-600': '#2563eb',
  'text-emerald-600': '#059669',
  'text-rose-600': '#e11d48',
  'text-amber-600': '#d97706',
  'text-slate-600': '#475569',
  'bg-indigo-500': '#6366f1',
  'bg-purple-500': '#a855f7',
  'bg-blue-500': '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-rose-500': '#f43f5e',
  'bg-amber-500': '#f59e0b',
  'bg-slate-500': '#64748b',
};

const getHexColor = (color: string) => {
  return COLOR_MAP[color] || COLOR_MAP[color.replace('text-', 'bg-')] || '#6366f1';
};

const ReportsView: React.FC<ReportsViewProps> = ({ data }) => {
  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      
      {/* Top Header: Title, Tabs, Date Picker */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
            <h2 className="text-2xl font-semibold text-slate-800">Reports</h2>
            
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
                <button className="px-4 py-1.5 text-sm font-medium bg-white text-indigo-600 rounded-md shadow-sm transition-all">Summary</button>
                <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all">Detailed</button>
                <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all">Weekly</button>
                <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all">Shared</button>
            </div>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 cursor-pointer hover:border-indigo-300 transition-colors">
            <Calendar size={16} className="text-slate-400 mr-2" />
            <span className="text-sm text-slate-700 font-medium">Last 30 Days</span>
            <div className="w-px h-4 bg-slate-200 mx-3"></div>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider hover:text-indigo-600">This Year</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase mr-2 tracking-wide">Filter</span>
            <FilterDropdown label="Team" />
            <FilterDropdown label="Client" />
            <FilterDropdown label="Project" />
            <FilterDropdown label="Task" />
            <FilterDropdown label="Tag" />
        </div>
        <button className="px-6 py-2 bg-sky-400 text-white text-sm font-semibold rounded hover:bg-sky-500 transition-colors uppercase tracking-wide shadow-sm">
            Apply Filter
        </button>
      </div>

      {/* Charts & Data Container */}
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
            <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1 text-sm shadow-sm">
                Project <ChevronDown size={12} className="ml-1 text-slate-400" />
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1 text-sm shadow-sm">
                Description <ChevronDown size={12} className="ml-1 text-slate-400" />
            </div>
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
            </div>
        </div>

      </div>
    </div>
  );
};

// --- Sub-components for Layout ---

const FilterDropdown: React.FC<{label: string}> = ({ label }) => (
    <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 hover:bg-white hover:border-indigo-300 transition-colors">
        {label}
        <ChevronDown size={12} className="text-slate-400" />
    </button>
);

const ActionIcon: React.FC<{icon: React.ReactNode, label?: string}> = ({ icon, label }) => (
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
    expanded?: boolean
}> = ({ label, sublabel, time, amount, color, expanded }) => (
    <div className={`border-b border-slate-100 ${expanded ? 'bg-slate-50/50' : 'bg-white'}`}>
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
