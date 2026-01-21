"use client";

import React, { useState, useTransition } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { InvoiceBlock } from '@/types';
import { resetInvoiceBlock } from '@/server/actions/invoice-blocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InvoiceBlockResetDialogProps {
  block: InvoiceBlock;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceBlockResetDialog: React.FC<InvoiceBlockResetDialogProps> = ({
  block,
  clientName,
  open,
  onOpenChange,
}) => {
  const [isPending, startTransition] = useTransition();
  const [carryOverage, setCarryOverage] = useState(true);
  const [newTargetHours, setNewTargetHours] = useState(block.hoursTarget.toString());
  const [createNewBlock, setCreateNewBlock] = useState(true);

  const totalAvailable = block.hoursTarget + block.hoursCarriedForward;
  const overage = Math.max(0, block.hoursTracked - totalAvailable);
  const hasOverage = overage > 0;

  const handleReset = async () => {
    startTransition(async () => {
      const result = await resetInvoiceBlock(
        block.id,
        hasOverage ? carryOverage : false,
        createNewBlock ? parseFloat(newTargetHours) || block.hoursTarget : undefined
      );

      if (result.success) {
        onOpenChange(false);
      } else {
        alert(result.error || 'Failed to reset invoice block');
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Reset Invoice Block
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You're about to complete the current invoice block for{' '}
                <strong>{clientName}</strong>.
              </p>

              <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hours tracked:</span>
                  <span className="font-medium">{block.hoursTracked.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target:</span>
                  <span className="font-medium">{totalAvailable.toFixed(1)}h</span>
                </div>
                {hasOverage && (
                  <div className="flex justify-between text-rose-600">
                    <span>Overage:</span>
                    <span className="font-medium">+{overage.toFixed(1)}h</span>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Create New Block Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createNew"
              checked={createNewBlock}
              onCheckedChange={(checked) => setCreateNewBlock(checked as boolean)}
            />
            <Label htmlFor="createNew" className="text-sm font-normal cursor-pointer">
              Create a new invoice block
            </Label>
          </div>

          {createNewBlock && (
            <div className="pl-6 space-y-4">
              {/* New Target */}
              <div className="space-y-2">
                <Label htmlFor="newTarget" className="text-sm">
                  New block target (hours)
                </Label>
                <Input
                  id="newTarget"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newTargetHours}
                  onChange={(e) => setNewTargetHours(e.target.value)}
                  disabled={isPending}
                  className="w-32"
                />
              </div>

              {/* Carry Overage Option */}
              {hasOverage && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="carryOverage"
                    checked={carryOverage}
                    onCheckedChange={(checked) => setCarryOverage(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="carryOverage" className="text-sm font-normal cursor-pointer">
                      Carry overage to new block
                    </Label>
                    <p className="text-xs text-slate-500">
                      The {overage.toFixed(1)}h overage will count against the new block's target
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
            {createNewBlock ? 'Reset & Create New' : 'Complete Block'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InvoiceBlockResetDialog;
