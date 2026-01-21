"use client";

import React from 'react';
import { ChevronDown, Clock, Check } from 'lucide-react';
import { InvoiceBlock, InvoiceBlockStatus } from '@/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface InvoiceBlockHistoryProps {
  blocks: InvoiceBlock[];
}

const InvoiceBlockHistory: React.FC<InvoiceBlockHistoryProps> = ({ blocks }) => {
  // Filter to only completed blocks
  const completedBlocks = blocks.filter(b => b.status === InvoiceBlockStatus.Completed);

  if (completedBlocks.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="history" className="border-0">
        <AccordionTrigger className="py-2 text-xs text-slate-500 hover:text-slate-700 hover:no-underline">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>View {completedBlocks.length} past block{completedBlocks.length !== 1 ? 's' : ''}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2 pt-2">
            {completedBlocks.map((block) => (
              <HistoryItem key={block.id} block={block} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const HistoryItem: React.FC<{ block: InvoiceBlock }> = ({ block }) => {
  const totalAvailable = block.hoursTarget + block.hoursCarriedForward;
  const overage = Math.max(0, block.hoursTracked - totalAvailable);

  const startDate = new Date(block.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const endDate = block.endDate
    ? new Date(block.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Ongoing';

  return (
    <div className="bg-slate-50 rounded-md p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Check size={12} className="text-emerald-500" />
          <span>{startDate} - {endDate}</span>
        </div>
        {overage > 0 && (
          <span className="text-rose-600 font-medium">+{overage.toFixed(1)}h over</span>
        )}
      </div>
      <div className="flex items-center justify-between text-slate-500">
        <span>Tracked: {block.hoursTracked.toFixed(1)}h</span>
        <span>Target: {totalAvailable.toFixed(1)}h</span>
      </div>
      {block.notes && (
        <p className="mt-2 text-slate-400 italic">{block.notes}</p>
      )}
    </div>
  );
};

export default InvoiceBlockHistory;
