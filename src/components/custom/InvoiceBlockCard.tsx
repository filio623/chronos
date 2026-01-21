"use client";

import React, { useState, useTransition } from 'react';
import { Target, RotateCcw, Pencil, Loader2, Clock } from 'lucide-react';
import { InvoiceBlock } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import InvoiceBlockResetDialog from './InvoiceBlockResetDialog';
import InvoiceBlockEditDialog from './InvoiceBlockEditDialog';

interface InvoiceBlockCardProps {
  block: InvoiceBlock;
  clientName: string;
}

const InvoiceBlockCard: React.FC<InvoiceBlockCardProps> = ({ block, clientName }) => {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const totalAvailable = block.hoursTarget + block.hoursCarriedForward;
  const hoursRemaining = Math.max(0, totalAvailable - block.hoursTracked);
  const overage = Math.max(0, block.hoursTracked - totalAvailable);
  const isOverBudget = block.hoursTracked > totalAvailable;

  // Determine progress color
  let progressColor = 'bg-emerald-500';
  if (block.progressPercent >= 100) {
    progressColor = 'bg-rose-500';
  } else if (block.progressPercent >= 80) {
    progressColor = 'bg-amber-500';
  }

  const formattedStartDate = new Date(block.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Target size={14} className="text-indigo-500" />
          <span className="font-medium text-slate-700">Invoice Block</span>
          <span className="text-slate-400">since {formattedStartDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit target</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                  onClick={() => setIsResetDialogOpen(true)}
                >
                  <RotateCcw size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset block</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-slate-900">
              {block.hoursTracked.toFixed(1)}h
            </span>
            <span className="text-slate-400 text-sm ml-1">
              / {totalAvailable.toFixed(1)}h
            </span>
          </div>
          {isOverBudget ? (
            <span className="text-rose-600 text-sm font-medium">
              +{overage.toFixed(1)}h over
            </span>
          ) : (
            <span className="text-slate-500 text-sm">
              {hoursRemaining.toFixed(1)}h remaining
            </span>
          )}
        </div>

        <div className="relative">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${Math.min(100, block.progressPercent)}%` }}
            />
          </div>
          {isOverBudget && (
            <div
              className="absolute top-0 h-2 bg-rose-300/50 rounded-full"
              style={{
                left: '100%',
                width: `${Math.min(50, (overage / totalAvailable) * 100)}%`,
                marginLeft: '-1px'
              }}
            />
          )}
        </div>

        {/* Carried Forward Notice */}
        {block.hoursCarriedForward > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={10} />
            <span>Includes {block.hoursCarriedForward.toFixed(1)}h carried forward</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {block.notes && (
        <p className="text-xs text-slate-500 italic">{block.notes}</p>
      )}

      {/* Dialogs */}
      <InvoiceBlockResetDialog
        block={block}
        clientName={clientName}
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
      />
      <InvoiceBlockEditDialog
        block={block}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
};

export default InvoiceBlockCard;
