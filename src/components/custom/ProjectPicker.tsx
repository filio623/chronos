"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Star } from "lucide-react";
import { Project } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { groupProjectsForPicker } from "@/lib/tracking";
import { cn } from "@/lib/utils";

type PickerValue = string | "none";

export function ProjectPicker({
  projects,
  value,
  onChange,
  recentProjectIds = [],
  disabled = false,
  allowCreate = true,
  className,
}: {
  projects: Project[];
  value: PickerValue;
  onChange: (value: PickerValue | "create-new") => void;
  recentProjectIds?: string[];
  disabled?: boolean;
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const grouped = useMemo(
    () => groupProjectsForPicker(projects, recentProjectIds),
    [projects, recentProjectIds],
  );
  const selected = value !== "none" ? projects.find((project) => project.id === value) : null;
  const label = selected ? selected.name : "No project";

  const choose = (next: PickerValue | "create-new") => {
    setOpen(false);
    onChange(next);
  };

  const renderItem = (project: Project) => (
    <CommandItem
      key={project.id}
      value={`${project.name} ${project.client}`}
      onSelect={() => choose(project.id)}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", project.color.replace("text-", "bg-"))} />
      <span className="truncate">{project.name}</span>
      {project.client && project.client !== "No Client" && (
        <span className="text-xs text-slate-400 truncate">{project.client}</span>
      )}
      {project.isFavorite && <Star size={12} className="ml-auto text-amber-400" fill="currentColor" />}
      {value === project.id && <Check size={14} className={cn("ml-auto", project.isFavorite && "hidden")} />}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Choose project"
          disabled={disabled}
          className={cn("justify-between h-[42px] bg-white border-slate-200 text-xs font-normal", className)}
        >
          <span className="truncate flex items-center gap-2">
            {selected && (
              <span className={cn("w-1.5 h-1.5 rounded-full", selected.color.replace("text-", "bg-"))} />
            )}
            {label}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup heading="None">
              <CommandItem value="no project unassigned" onSelect={() => choose("none")}>
                No project
                {value === "none" && <Check size={14} className="ml-auto" />}
              </CommandItem>
            </CommandGroup>
            {grouped.favorites.length > 0 && (
              <CommandGroup heading="Favorites">
                {grouped.favorites.map(renderItem)}
              </CommandGroup>
            )}
            {grouped.recents.length > 0 && (
              <CommandGroup heading="Recents">
                {grouped.recents.map(renderItem)}
              </CommandGroup>
            )}
            {grouped.rest.length > 0 && (
              <CommandGroup heading="All projects">
                {grouped.rest.map(renderItem)}
              </CommandGroup>
            )}
            {allowCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="create new project" onSelect={() => choose("create-new")}>
                    <Plus size={12} className="text-indigo-600" />
                    <span className="text-indigo-600">Create new project...</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
