"use client";

import React, { useState, useTransition } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Loader2,
  Trash2,
  Clock
} from 'lucide-react';
import { Client, InvoiceBlock } from '@/types';
import { createClient, updateClient, deleteClient } from '@/server/actions/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import InvoiceBlockCard from './InvoiceBlockCard';
import CreateInvoiceBlockDialog from './CreateInvoiceBlockDialog';
import InvoiceBlockHistory from './InvoiceBlockHistory';
import ColorPicker, { InlineColorPicker } from './ColorPicker';

interface ClientsListProps {
  clients: Client[];
  invoiceBlockHistory?: Record<string, InvoiceBlock[]>;
}

const ClientsList: React.FC<ClientsListProps> = ({ clients: initialClients, invoiceBlockHistory = {} }) => {
  const [filterText, setFilterText] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientColor, setNewClientColor] = useState('text-indigo-600');
  const [isPending, startTransition] = useTransition();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const filteredClients = initialClients.filter(c =>
    c.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || isPending) return;

    const formData = new FormData();
    formData.append('name', newClientName);
    formData.append('color', newClientColor);

    startTransition(async () => {
      const result = await createClient(formData);
      if (result.success) {
        setNewClientName('');
        setNewClientColor('text-indigo-600');
      } else {
        alert(result.error || 'Failed to create client');
      }
    });
  };

  const toggleExpanded = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
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
        <form onSubmit={handleAddClient} className="flex w-full xl:w-auto items-center gap-2">
            <ColorPicker value={newClientColor} onChange={setNewClientColor} disabled={isPending} />
            <div className="flex gap-0 shadow-sm rounded-md flex-1 xl:flex-none">
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
            </div>
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
                <th className="px-4 py-3">Hours Tracked</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 w-24 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  isExpanded={expandedClients.has(client.id)}
                  onToggleExpand={() => toggleExpanded(client.id)}
                  invoiceBlockHistory={invoiceBlockHistory[client.id] || []}
                />
              ))}
              {filteredClients.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
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

interface ClientRowProps {
  client: Client;
  isExpanded: boolean;
  onToggleExpand: () => void;
  invoiceBlockHistory: InvoiceBlock[];
}

const ClientRow: React.FC<ClientRowProps> = ({ client, isExpanded, onToggleExpand, invoiceBlockHistory }) => {
  const [isPending, startTransition] = useTransition();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editColor, setEditColor] = useState(client.color || 'text-indigo-600');

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${client.name}"? This will also delete all associated projects and invoice blocks.`)) {
      startTransition(async () => {
        await deleteClient(client.id);
      });
    }
  };

  const handleEditClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateClient(client.id, formData);
      if (result.success) {
        setIsEditDialogOpen(false);
      } else {
        alert(result.error || 'Failed to update client');
      }
    });
  };

  const handleColorChange = async (newColor: string) => {
    setEditColor(newColor);
    const formData = new FormData();
    formData.append('name', client.name);
    formData.append('color', newColor);
    formData.append('currency', client.currency);
    if (client.address) {
      formData.append('address', client.address);
    }
    if (client.budgetLimit) {
      formData.append('budgetLimit', client.budgetLimit.toString());
    }

    startTransition(async () => {
      await updateClient(client.id, formData);
    });
  };

  // Calculate budget progress
  const hoursTracked = client.hoursTracked || 0;
  const budgetLimit = client.budgetLimit || 0;
  const budgetProgress = budgetLimit > 0 ? (hoursTracked / budgetLimit) * 100 : 0;
  const isOverBudget = budgetLimit > 0 && hoursTracked > budgetLimit;

  const hasInvoiceBlock = !!client.activeInvoiceBlock;

  return (
    <>
      <tr className={`group hover:bg-slate-50/80 transition-colors text-sm text-slate-700 ${isPending ? 'opacity-50 grayscale' : ''}`}>
        <td className="px-4 py-3 text-center">
          <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <InlineColorPicker value={client.color || 'text-slate-600'} onChange={handleColorChange} disabled={isPending} />
            <button
              onClick={onToggleExpand}
              className="font-medium text-slate-900 hover:text-indigo-600 flex items-center gap-1"
            >
              {client.name}
              {hasInvoiceBlock && (
                <span className="ml-1 text-xs text-indigo-500 font-normal">(block active)</span>
              )}
              {(hasInvoiceBlock || invoiceBlockHistory.length > 0) && (
                isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </button>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 text-slate-600">
            <Clock size={12} className="text-slate-400" />
            <span className="font-mono">{hoursTracked.toFixed(1)}h</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {budgetLimit > 0 ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, budgetProgress)}%` }}
                />
              </div>
              <span className={`text-xs font-mono ${isOverBudget ? 'text-rose-600' : 'text-slate-500'}`}>
                {budgetLimit}h
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">No limit</span>
          )}
        </td>
        <td className="px-4 py-3 text-slate-600">{client.currency}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!hasInvoiceBlock && (
              <CreateInvoiceBlockDialog clientId={client.id} clientName={client.name} />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-slate-300 hover:text-slate-600 p-1">
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer">
                  <Pencil size={14} className="mr-2" />
                  Edit Client
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer">
                  <Trash2 size={14} className="mr-2" />
                  Delete Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {/* Expanded Invoice Block Section */}
      {isExpanded && (hasInvoiceBlock || invoiceBlockHistory.length > 0) && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-slate-50/50">
            <div className="max-w-xl space-y-3">
              {client.activeInvoiceBlock && (
                <InvoiceBlockCard
                  block={client.activeInvoiceBlock}
                  clientName={client.name}
                />
              )}
              {invoiceBlockHistory.length > 0 && (
                <InvoiceBlockHistory blocks={invoiceBlockHistory} />
              )}
              {!hasInvoiceBlock && invoiceBlockHistory.length > 0 && (
                <CreateInvoiceBlockDialog
                  clientId={client.id}
                  clientName={client.name}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Start New Invoice Block
                    </Button>
                  }
                />
              )}
            </div>
          </td>
        </tr>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (open) setEditColor(client.color || 'text-indigo-600');
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditClient} className="space-y-4 py-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Client Name</Label>
              <div className="flex items-center gap-2">
                <ColorPicker value={editColor} onChange={setEditColor} disabled={isPending} />
                <Input id="edit-name" name="name" defaultValue={client.name} required disabled={isPending} className="flex-1" />
              </div>
              <input type="hidden" name="color" value={editColor} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" name="address" defaultValue={client.address || ''} disabled={isPending} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Input id="edit-currency" name="currency" defaultValue={client.currency} maxLength={3} disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budgetLimit">Budget Limit (h)</Label>
                <Input
                  id="edit-budgetLimit"
                  name="budgetLimit"
                  type="number"
                  step="0.5"
                  defaultValue={client.budgetLimit || 0}
                  disabled={isPending}
                />
              </div>
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
    </>
  );
};

export default ClientsList;
