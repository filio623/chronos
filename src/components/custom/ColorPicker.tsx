"use client";

import React from 'react';
import { Check } from 'lucide-react';
import { COLOR_PALETTE, textToBg, getColorName } from '@/lib/colors';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-slate-200"
          disabled={disabled}
          type="button"
        >
          <span
            className={`w-4 h-4 rounded-full ${textToBg(value || 'text-slate-600')}`}
          />
          <span className="sr-only">Pick a color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-4 gap-2">
          <TooltipProvider>
            {COLOR_PALETTE.map((color) => (
              <Tooltip key={color}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`w-7 h-7 rounded-full ${textToBg(color)} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    onClick={() => {
                      onChange(color);
                      setIsOpen(false);
                    }}
                  >
                    {value === color && (
                      <Check size={14} className="text-white drop-shadow-sm" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {getColorName(color)}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;
