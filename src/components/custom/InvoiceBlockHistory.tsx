"use client";

import React, { useTransition } from 'react';
import { toast } from "sonner";
import { Clock, Check } from 'lucide-react';
import { InvoiceBlock, InvoiceBlockStatus } from '@/types';
import { updateInvoiceBlockStatus } from '@/server/actions/invoice-blocks';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface InvoiceBlockHistoryProps {
  blocks: InvoiceBlock[];
}

const STATUS_BADGE_CLASS: Record<InvoiceBlockStatus, string> = {
  [InvoiceBlockStatus.Active]: 'bg-emerald-50 text-emerald-700',
  [InvoiceBlockStatus.Completed]: 'bg-amber-50 text-amber-700',
  [InvoiceBlockStatus.Submitted]: 'bg-indigo-50 text-indigo-700',
  [InvoiceBlockStatus.Paid]: 'bg-emerald-100 text-emerald-800',
};

function getStatusLabel(status: InvoiceBlockStatus): string {
  if (status === InvoiceBlockStatus.Submitted) return 'Submitted';
  if (status === InvoiceBlockStatus.Paid) return 'Paid';
  if (status === InvoiceBlockStatus.Completed) return 'Completed';
  return 'Active';
}

const InvoiceBlockHistory: React.FC<InvoiceBlockHistoryProps> = ({ blocks }) => {
  const pastBlocks = blocks.filter((block) => block.status !== InvoiceBlockStatus.Active);

  if (pastBlocks.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="history" className="border-0">
        <AccordionTrigger className="py-2 text-xs text-slate-500 hover:text-slate-700 hover:no-underline">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>View {pastBlocks.length} past block{pastBlocks.length !== 1 ? 's' : ''}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2 pt-2">
            {pastBlocks.map((block) => (
              <HistoryItem key={block.id} block={block} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const HistoryItem: React.FC<{ block: InvoiceBlock }> = ({ block }) => {
  const [isPending, startTransition] = useTransition();
  const overage = Math.max(0, block.hoursTracked - block.hoursTarget);

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

  const handleStatusUpdate = (status: InvoiceBlockStatus.Completed | InvoiceBlockStatus.Submitted | InvoiceBlockStatus.Paid) => {
    startTransition(async () => {
      const result = await updateInvoiceBlockStatus(block.id, status);
      if (!result.success) {
        toast.error(result.error || 'Failed to update block status');
      }
    });
  };

  const showMarkSubmitted = block.status === InvoiceBlockStatus.Completed;
  const showMarkPaid = block.status === InvoiceBlockStatus.Submitted;

  return (
    <div className="bg-slate-50 rounded-md p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Check size={12} className="text-emerald-500" />
          <span>{startDate} - {endDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_CLASS[block.status]}`}>
            {getStatusLabel(block.status)}
          </span>
          {overage > 0 && (
            <span className="text-rose-600 font-medium">+{overage.toFixed(1)}h over</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-slate-500">
        <span>Tracked: {block.hoursTracked.toFixed(1)}h</span>
        <span>Target: {block.hoursTarget.toFixed(1)}h</span>
      </div>

      {(showMarkSubmitted || showMarkPaid) && (
        <div className="flex items-center gap-2 pt-1">
          {showMarkSubmitted && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={isPending}
              onClick={() => handleStatusUpdate(InvoiceBlockStatus.Submitted)}
            >
              Mark Submitted
            </Button>
          )}
          {showMarkPaid && (
            <Button
              type="button"
              size="sm"
              className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
              disabled={isPending}
              onClick={() => handleStatusUpdate(InvoiceBlockStatus.Paid)}
            >
              Mark Paid
            </Button>
          )}
        </div>
      )}

      {block.notes && (
        <p className="text-slate-400 italic">{block.notes}</p>
      )}
    </div>
  );
};

export default InvoiceBlockHistory;
