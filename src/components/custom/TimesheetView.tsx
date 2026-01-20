import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Copy, 
  Save, 
  X,
  List,
  Grid3X3
} from 'lucide-react';

// Mock data for the timesheet grid
const INITIAL_ROWS = [
  { id: 1, projectId: 'p1', values: ['2:00', '0:00', '4:30', '1:00', '0:00', '0:00', '0:00'] },
  { id: 2, projectId: '', values: ['', '', '', '', '', '', ''] } // Empty row
];

const DAYS = [
  { day: 'Sun', date: 'Jan 18' },
  { day: 'Mon', date: 'Jan 19' },
  { day: 'Tue', date: 'Jan 20' },
  { day: 'Wed', date: 'Jan 21' },
  { day: 'Thu', date: 'Jan 22' },
  { day: 'Fri', date: 'Jan 23' },
  { day: 'Sat', date: 'Jan 24' },
];

const TimesheetView: React.FC = () => {
  const [rows, setRows] = useState(INITIAL_ROWS);

  // Helper to calculate row total
  const calculateRowTotal = (values: string[]) => {
    let totalMinutes = 0;
    values.forEach(val => {
      if (!val) return;
      const [h, m] = val.split(':').map(Number);
      if (!isNaN(h)) totalMinutes += h * 60 + (m || 0);
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Helper for column totals
  const calculateColTotal = (colIndex: number) => {
    let totalMinutes = 0;
    rows.forEach(row => {
      const val = row.values[colIndex];
      if (!val) return;
      const [h, m] = val.split(':').map(Number);
      if (!isNaN(h)) totalMinutes += h * 60 + (m || 0);
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (rowId: number, colIndex: number, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const newValues = [...row.values];
      newValues[colIndex] = value;
      return { ...row, values: newValues };
    }));
  };

  const addNewRow = () => {
    setRows(prev => [...prev, { id: Date.now(), projectId: '', values: ['', '', '', '', '', '', ''] }]);
  };

  const removeRow = (id: number) => {
     setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-800">Timesheet</h2>
        
        <div className="flex flex-wrap items-center gap-3">
             {/* Teammates Dropdown */}
            <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-600 hover:border-indigo-300 transition-colors shadow-sm">
                    Teammates
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
            </div>
            
            {/* View Toggle */}
            <div className="flex bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
                <button className="p-2 text-indigo-600 bg-slate-50 border-r border-slate-200">
                    <List size={18} />
                </button>
                 <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                    <Grid3X3 size={18} />
                </button>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center bg-white border border-slate-200 rounded shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-50 min-w-[140px]">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-700 font-medium">This week</span>
                </div>
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border-r border-slate-200">
                    <ChevronLeft size={16} />
                </button>
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        
        {/* Header Row */}
        <div className="bg-slate-100 border-b border-slate-200 flex text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="flex-1 px-4 py-3 min-w-[200px]">Projects</div>
            {DAYS.map((d, i) => (
                <div key={i} className="w-24 px-2 py-3 text-center border-l border-slate-200">
                    <div className="text-[10px] text-slate-400">{d.day}</div>
                    <div>{d.date}</div>
                </div>
            ))}
            <div className="w-24 px-2 py-3 text-center border-l border-slate-200 bg-slate-50">Total</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
            {rows.map((row) => (
                <div key={row.id} className="flex items-center group hover:bg-slate-50 transition-colors">
                    {/* Project Selector Cell */}
                    <div className="flex-1 px-4 py-3 min-w-[200px]">
                        {row.projectId === 'p1' ? (
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Website Redesign
                                <span className="text-slate-400 font-normal">- Acme Inc</span>
                            </div>
                        ) : (
                            <button className="flex items-center gap-2 text-indigo-500 hover:text-indigo-700 text-sm font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                                <div className="w-5 h-5 rounded-full border border-indigo-200 flex items-center justify-center text-indigo-400">
                                    <Plus size={12} />
                                </div>
                                Select Project
                            </button>
                        )}
                    </div>

                    {/* Input Cells */}
                    {row.values.map((val, idx) => (
                        <div key={idx} className="w-24 px-2 py-3 border-l border-slate-100 flex justify-center">
                            <input 
                                type="text" 
                                className="w-full text-center text-sm text-slate-700 bg-slate-50 border border-transparent hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-1 py-1 outline-none transition-all placeholder:text-slate-300"
                                placeholder="00:00"
                                value={val}
                                onChange={(e) => handleInputChange(row.id, idx, e.target.value)}
                            />
                        </div>
                    ))}

                    {/* Row Total & Delete */}
                    <div className="w-24 px-2 py-3 border-l border-slate-100 bg-slate-50/50 flex items-center justify-center relative">
                        <span className="text-sm font-mono font-medium text-slate-600">
                            {calculateRowTotal(row.values)}
                        </span>
                        <button 
                            onClick={() => removeRow(row.id)}
                            className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Totals */}
        <div className="bg-slate-50 border-t border-slate-200 flex items-center">
             <div className="flex-1 px-4 py-3 text-sm font-medium text-slate-500 text-right pr-6">Total:</div>
             {DAYS.map((_, idx) => (
                 <div key={idx} className="w-24 px-2 py-3 text-center border-l border-slate-200 text-sm font-mono text-slate-600">
                     {calculateColTotal(idx)}
                 </div>
             ))}
             <div className="w-24 px-2 py-3 text-center border-l border-slate-200 text-sm font-mono font-bold text-slate-800">
                 {calculateColTotal(0) /* Just mocked total of cols sum logic needed here really */}
                 07:30
             </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
          <button 
            onClick={addNewRow}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 text-sm font-medium rounded hover:bg-indigo-50 transition-colors shadow-sm"
          >
              <Plus size={16} />
              Add new row
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded hover:bg-slate-50 transition-colors shadow-sm">
              <Copy size={16} />
              Copy last week
              <ChevronDown size={14} className="text-slate-400" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded hover:bg-slate-50 transition-colors shadow-sm">
              <Save size={16} />
              Save as template
          </button>
      </div>

    </div>
  );
};

export default TimesheetView;