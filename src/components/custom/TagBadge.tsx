"use client";

import React from 'react';
import { X } from 'lucide-react';
import { Tag } from '@/types';
import { textToBg } from '@/lib/colors';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, size = 'sm' }) => {
  const bgClass = tag.color ? textToBg(tag.color) : 'bg-slate-200';
  const textClass = tag.color || 'text-slate-700';

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium ${bgClass} ${textClass.replace('text-', 'text-')} bg-opacity-20`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${bgClass}`} />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};

export default TagBadge;
