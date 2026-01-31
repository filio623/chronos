"use client";

import React, { useState, useTransition } from 'react';
import { Check, Plus, Loader2, Tag as TagIcon } from 'lucide-react';
import { Tag } from '@/types';
import { createTag } from '@/server/actions/tags';
import { textToBg } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import TagBadge from './TagBadge';

interface TagPickerProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const TagPicker: React.FC<TagPickerProps> = ({
  availableTags,
  selectedTagIds,
  onSelectionChange,
  disabled = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedTags = availableTags.filter(t => selectedTagIds.includes(t.id));
  const systemTags = availableTags.filter(t => t.isSystem);
  const customTags = availableTags.filter(t => !t.isSystem);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const formData = new FormData();
    formData.append('name', newTagName);

    startTransition(async () => {
      const result = await createTag(formData);
      if (result.success && result.data) {
        onSelectionChange([...selectedTagIds, result.data.id]);
        setNewTagName('');
        setIsCreating(false);
      } else {
        alert(result.error || 'Failed to create tag');
      }
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={compact
            ? "h-7 w-8 px-1 justify-center font-normal"
            : "h-auto min-h-[32px] px-2 py-1 justify-start font-normal"}
          disabled={disabled}
          type="button"
        >
          {compact ? (
            <div className="flex items-center gap-1 text-slate-400">
              <TagIcon size={14} />
              {selectedTags.length > 0 && (
                <span className="text-[10px] font-medium text-slate-600">
                  {selectedTags.length}
                </span>
              )}
            </div>
          ) : selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedTags.map(tag => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onRemove={() => toggleTag(tag.id)}
                />
              ))}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">Add tags...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>

            {systemTags.length > 0 && (
              <CommandGroup heading="System Tags">
                {systemTags.map(tag => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggleTag(tag.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className={`w-2 h-2 rounded-full ${tag.color ? textToBg(tag.color) : 'bg-slate-400'}`}
                      />
                      {tag.name}
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <Check size={14} className="text-emerald-500" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {customTags.length > 0 && (
              <CommandGroup heading="Custom Tags">
                {customTags.map(tag => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggleTag(tag.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className={`w-2 h-2 rounded-full ${tag.color ? textToBg(tag.color) : 'bg-slate-400'}`}
                      />
                      {tag.name}
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <Check size={14} className="text-emerald-500" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            <CommandGroup>
              {isCreating ? (
                <div className="p-2 flex items-center gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateTag();
                      } else if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewTagName('');
                      }
                    }}
                    disabled={isPending}
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleCreateTag}
                    disabled={isPending || !newTagName.trim()}
                  >
                    {isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                  </Button>
                </div>
              ) : (
                <CommandItem
                  onSelect={() => setIsCreating(true)}
                  className="cursor-pointer text-indigo-600"
                >
                  <Plus size={14} className="mr-2" />
                  Create new tag
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TagPicker;
