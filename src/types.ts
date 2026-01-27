export enum ProjectStatus {
  Safe = 'Safe',
  Warning = 'Warning',
  Danger = 'Danger'
}

export enum InvoiceBlockStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED'
}

export interface InvoiceBlock {
  id: string;
  clientId: string;
  hoursTarget: number;
  hoursCarriedForward: number;
  startDate: string;
  endDate: string | null;
  status: InvoiceBlockStatus;
  notes?: string;
  // Computed for UI
  hoursTracked: number;
  progressPercent: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  isSystem: boolean;
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
  isArchived?: boolean;
  tags?: Tag[];
}

export interface Client {
  id: string;
  name: string;
  address?: string;
  currency: string;
  color: string;
  budgetLimit: number;
  hoursTracked?: number;
  activeInvoiceBlock?: InvoiceBlock | null;
}

export interface TimeEntry {
  id: string;
  description: string;
  projectId: string;
  clientId?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string or simple time string for UI
  startTimeISO?: string; // Full ISO timestamp for calculations
  pausedAtISO?: string | null;
  pausedSeconds?: number;
  isPaused?: boolean;
  endTime: string;
  duration: string;
  durationSeconds: number; // Helper for calculations
  isBillable: boolean;
}
