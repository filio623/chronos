import React, { useState, useTransition } from 'react';
import { 
  Search, 
  ChevronDown, 
  MoreVertical, 
  Pencil,
  Loader2
} from 'lucide-react';
import { Client } from '@/types';
import { createClient } from '@/server/actions/clients';

interface ClientsListProps {
  clients: Client[];
}

const ClientsList: React.FC<ClientsListProps> = ({ clients: initialClients }) => {
  const [filterText, setFilterText] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [isPending, startTransition] = useTransition();

  const filteredClients = initialClients.filter(c => 
    c.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || isPending) return;

    const formData = new FormData();
    formData.append('name', newClientName);

    startTransition(async () => {
      const result = await createClient(formData);
      if (result.success) {
        setNewClientName('');
      } else {
        alert(result.error || 'Failed to create client');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Header */}
      <h2 className="text-2xl font-semibold text-slate-800">Clients</h2>

      {/* Controls Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        
        {/* Left: Filter & Search */}
        <div className="flex flex-1 w-full xl:w-auto items-center gap-3">
             <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap">
                Show active
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            <div className="relative flex-1 max-w-md group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search by name" 
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>
        </div>

        {/* Right: Add Client */}
        <form onSubmit={handleAddClient} className="flex w-full xl:w-auto gap-0 shadow-sm rounded-md">
            <input 
                type="text" 
                name="name"
                placeholder="Add new Client"
                disabled={isPending}
                className="flex-1 xl:w-64 px-4 py-2 text-sm border border-r-0 border-slate-200 rounded-l-md outline-none focus:z-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 disabled:bg-slate-50"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
            />
            <button 
                type="submit"
                disabled={isPending}
                className="px-6 py-2 bg-sky-400 text-white text-sm font-semibold rounded-r-md hover:bg-sky-500 transition-colors uppercase tracking-wide disabled:bg-sky-300 flex items-center justify-center min-w-[80px]"
            >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
            </button>
        </form>
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 w-24 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
              {clients.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                        No clients found.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ClientRow: React.FC<{client: Client}> = ({ client }) => {
    return (
        <tr className="group hover:bg-slate-50/80 transition-colors text-sm text-slate-700">
            <td className="px-4 py-3 text-center">
                 <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
            </td>
            <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
            <td className="px-4 py-3 text-slate-500 italic">{client.address || '-'}</td>
            <td className="px-4 py-3 text-slate-600">{client.currency}</td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-300 hover:text-slate-600 p-1">
                        <Pencil size={16} />
                    </button>
                    <button className="text-slate-300 hover:text-slate-600 p-1">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default ClientsList;