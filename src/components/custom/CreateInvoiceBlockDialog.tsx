"use client";

import React, { useState, useTransition } from 'react';
import { Loader2, Target } from 'lucide-react';
import { createInvoiceBlock } from '@/server/actions/invoice-blocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CreateInvoiceBlockDialogProps {
  clientId: string;
  clientName: string;
  trigger?: React.ReactNode;
}

const CreateInvoiceBlockDialog: React.FC<CreateInvoiceBlockDialogProps> = ({
  clientId,
  clientName,
  trigger,
}) => {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [hoursTarget, setHoursTarget] = useState('10');
  const [notes, setNotes] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await createInvoiceBlock(
        clientId,
        parseFloat(hoursTarget) || 10,
        notes.trim() || undefined
      );

      if (result.success) {
        setIsOpen(false);
        setHoursTarget('10');
        setNotes('');
      } else {
        alert(result.error || 'Failed to create invoice block');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-xs">
            <Target size={12} className="mr-1" />
            Set Invoice Target
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create Invoice Block</DialogTitle>
          <DialogDescription>
            Set a target hours budget for <strong>{clientName}</strong>. Track progress and get
            notified when approaching the limit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="hours">Target Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0.5"
              value={hoursTarget}
              onChange={(e) => setHoursTarget(e.target.value)}
              disabled={isPending}
              className="w-32"
              placeholder="10"
            />
            <p className="text-xs text-slate-500">
              How many hours are included in this invoice block?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder="e.g., January 2024 retainer, Project phase 1"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !hoursTarget}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Create Block
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceBlockDialog;
