"use client";

import React from 'react';
import TrackerList from '@/components/custom/TrackerList';
import { Project, Client, TimeEntry, Tag } from '@/types';
import { useTimerSession } from './TimerSessionContext';

export type TrackerFilterState = {
  q: string;
  project: string;
  client: string;
  billable: string;
};

interface TrackerPageClientProps {
  entries: TimeEntry[];
  projects: Project[];
  clients: Client[];
  tags: Tag[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: TrackerFilterState;
}

export default function TrackerPageClient({
  entries,
  projects,
  clients,
  tags,
  totalCount,
  page,
  pageSize,
  filters,
}: TrackerPageClientProps) {
  const { requestStart } = useTimerSession();

  const handleRestart = async (entry: TimeEntry) => {
    await requestStart(entry.projectId || null, entry.description, { isBillable: entry.isBillable });
  };

  return (
    <TrackerList
      entries={entries}
      projects={projects}
      clients={clients}
      tags={tags}
      onRestart={handleRestart}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      filters={filters}
    />
  );
}
