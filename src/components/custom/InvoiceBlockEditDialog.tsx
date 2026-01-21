"use client";

import React, { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { InvoiceBlock } from '@/types';
import { updateInvoiceBlock } from '@/server/actions/invoice-blocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvoiceBlockEditDialogProps {
  block: InvoiceBlock;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceBlockEditDialog: React.FC<InvoiceBlockEditDialogProps> = ({
  block,
  open,
  onOpenChange,
}) => {
  const [isPending, startTransition] = useTransition();
  const [hoursTarget, setHoursTarget] = useState(block.hoursTarget.toString());
  const [notes, setNotes] = useState(block.notes || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateInvoiceBlock(block.id, {
        hoursTarget: parseFloat(hoursTarget) || block.hoursTarget,
        notes: notes.trim() || null,
      });

      if (result.success) {
        onOpenChange(false);
      } else {
        alert(result.error || 'Failed to update invoice block');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Invoice Block</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-hours">Target Hours</Label>
            <Input
              id="edit-hours"
              type="number"
              step="0.5"
              min="0.5"
              value={hoursTarget}
              onChange={(e) => setHoursTarget(e.target.value)}
              disabled={isPending}
              className="w-32"
            />
            <p className="text-xs text-slate-500">
              Current progress: {block.hoursTracked.toFixed(1)}h tracked
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder="e.g., Q1 2024 retainer"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceBlockEditDialog;
