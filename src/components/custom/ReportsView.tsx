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

const ReportsView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      
      {/* Top Header: Title, Tabs, Date Picker */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
            <h2 className="text-2xl font-semibold text-slate-800">Reports</h2>
            
            {/* Tabs */}
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
                <button className="px-4 py-1.5 text-sm font-medium bg-white text-indigo-600 rounded-md shadow-sm transition-all">Summary</button>
                <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all">Detailed</button>
                <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all">Weekly</button>
                <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all">Shared</button>
            </div>
        </div>

        {/* Date Picker Mock */}
        <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 cursor-pointer hover:border-indigo-300 transition-colors">
            <Calendar size={16} className="text-slate-400 mr-2" />
            <span className="text-sm text-slate-700 font-medium">Sep 1, 2025 - Jan 30, 2026</span>
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
                    <div className="text-2xl font-mono font-bold text-slate-800">22:56:17</div>
                </div>
                <div className="w-px h-10 bg-slate-200 hidden xl:block"></div>
                <div>
                    <div className="text-xs text-slate-500 font-medium mb-1">Billable Time</div>
                    <div className="text-2xl font-mono font-bold text-slate-800">22:56:17</div>
                </div>
                <div className="w-px h-10 bg-slate-200 hidden xl:block"></div>
                <div>
                    <div className="text-xs text-slate-500 font-medium mb-1">Amount</div>
                    <div className="text-2xl font-mono font-bold text-slate-800 flex items-baseline">
                        <span className="text-sm text-slate-500 mr-1">USD</span>
                        0.00
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
            <BarChart />
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
        <div className="flex flex-col lg:flex-row h-[400px]">
            {/* Left: Data List */}
            <div className="flex-1 overflow-y-auto border-r border-slate-200">
                <ReportRow 
                    label="CLDB-AI Dashboard" 
                    sublabel="Direct Mail 2.0" 
                    time="13:29:33" 
                    amount="0.00" 
                    color="bg-sky-500" 
                    expanded={true}
                />
                <ReportRow 
                    label="Enterprise Mail Tracker" 
                    sublabel="Direct Mail 2.0" 
                    time="09:26:44" 
                    amount="0.00" 
                    color="bg-emerald-500"
                />
                 <ReportRow 
                    label="Internal Ops" 
                    sublabel="Acme Corp" 
                    time="04:12:10" 
                    amount="0.00" 
                    color="bg-amber-500"
                />
            </div>

            {/* Right: Donut Chart */}
            <div className="w-full lg:w-[400px] bg-white flex items-center justify-center p-8">
                <DonutChart />
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
        {/* Expanded Mock Content */}
        {expanded && (
            <div className="pl-14 pr-6 pb-4 pt-0">
                <table className="w-full text-xs text-left text-slate-500">
                    <tbody>
                        <tr className="border-t border-slate-200/50">
                            <td className="py-2">Fixing Navbar Bugs</td>
                            <td className="py-2 text-right">04:15:22</td>
                        </tr>
                        <tr className="border-t border-slate-200/50">
                            <td className="py-2">Database Migration</td>
                            <td className="py-2 text-right">09:14:11</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// --- Simple CSS Charts (No heavy libraries) ---

const BarChart: React.FC = () => {
    // Generate 30 days of mock heights
    const bars = Array.from({ length: 45 }, (_, i) => {
        const height = Math.random() * 100;
        const isWeekend = i % 7 === 0 || i % 7 === 6;
        return { height: isWeekend ? 0 : height, label: i % 5 === 0 ? `Nov ${i + 1}` : '' };
    });

    return (
        <div className="w-full h-full flex items-end justify-between gap-[2px]">
            {bars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {bar.height.toFixed(1)} hrs
                    </div>
                    {/* Bar */}
                    <div 
                        className={`w-full max-w-[8px] rounded-t-sm transition-all duration-300 ${bar.height > 80 ? 'bg-emerald-500' : 'bg-emerald-400/70'} hover:bg-indigo-500`}
                        style={{ height: `${Math.max(bar.height, 4)}%` }} // min height for visibility
                    ></div>
                    {/* X-Axis Label */}
                    {bar.label && (
                        <div className="absolute top-full mt-2 text-[10px] text-slate-400 whitespace-nowrap">
                            {bar.label}
                        </div>
                    )}
                </div>
            ))}
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-[10px] text-slate-300 font-mono">
                <div className="border-b border-dashed border-slate-100 w-full h-0 flex items-center"><span>2.2h</span></div>
                <div className="border-b border-dashed border-slate-100 w-full h-0 flex items-center"><span>1.5h</span></div>
                <div className="border-b border-dashed border-slate-100 w-full h-0 flex items-center"><span>0.8h</span></div>
                <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
            </div>
        </div>
    );
};

const DonutChart: React.FC = () => {
    return (
        <div className="relative w-64 h-64">
             {/* SVG Donut */}
             <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                {/* Segment 1: Sky 500 - ~60% */}
                <circle 
                    cx="50" cy="50" r="40" 
                    fill="transparent" 
                    stroke="#0ea5e9" 
                    strokeWidth="16" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="100" // (100 - 60) / 100 * 251.2 approx
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                />
                 {/* Segment 2: Emerald 500 - ~25% */}
                <circle 
                    cx="50" cy="50" r="40" 
                    fill="transparent" 
                    stroke="#10b981" 
                    strokeWidth="16" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="188" // Offset to start where prev ended
                    className="transform origin-center rotate-[216deg] hover:opacity-80 transition-opacity cursor-pointer" // 60% * 360 = 216deg
                />
                 {/* Segment 3: Amber 500 - ~15% */}
                 <circle 
                    cx="50" cy="50" r="40" 
                    fill="transparent" 
                    stroke="#f59e0b" 
                    strokeWidth="16" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="213" 
                    className="transform origin-center rotate-[306deg] hover:opacity-80 transition-opacity cursor-pointer"
                />
             </svg>
             {/* Center Text */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-mono font-bold text-slate-800 tracking-tighter">22:56</span>
                 <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Hours</span>
             </div>
        </div>
    );
};

export default ReportsView;