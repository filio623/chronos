export enum ProjectStatus {
  Safe = 'Safe',
  Warning = 'Warning',
  Danger = 'Danger'
}

export interface Project {
  id: string;
  name: string;
  client: string;
  clientId?: string | null;
  color: string; // Tailwind class mostly, or hex
  hoursUsed: number;
  hoursTotal: number;
  access?: 'Public' | 'Private';
  amount?: string;
  isFavorite?: boolean;
}

export interface Client {
  id: string;
  name: string;
  address?: string;
  currency: string;
}

export interface TimeEntry {
  id: string;
  description: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string or simple time string for UI
  endTime: string;
  duration: string;
  durationSeconds: number; // Helper for calculations
  isBillable: boolean;
}