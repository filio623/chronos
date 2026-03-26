"use client";

import React from 'react';
import TrackerList from '@/components/custom/TrackerList';
import { Project, Client, TimeEntry, Tag } from '@/types';
import { startTimer } from '@/server/actions/time-entries';

interface TrackerPageClientProps {
  entries: TimeEntry[];
  projects: Project[];
  clients: Client[];
  tags: Tag[];
}

export default function TrackerPageClient({ entries, projects, clients, tags }: TrackerPageClientProps) {
  const handleRestart = async (entry: TimeEntry) => {
    await startTimer(entry.projectId, entry.description);
  };

  return (
    <TrackerList
      entries={entries}
      projects={projects}
      clients={clients}
      tags={tags}
      onRestart={handleRestart}
    />
  );
}
