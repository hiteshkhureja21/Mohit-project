import { Transformation } from './transformation';

export type WorkspaceType = 'operations' | 'communications' | 'research' | 'compliance' | 'other';

export type DashboardType = 'operations' | 'verification' | 'communications' | 'research' | 'custom';

export interface Dashboard {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  type: DashboardType;
  modules: string[]; // e.g. ['transformations', 'reviews', 'documents', 'activity', 'deliveries']
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  type: WorkspaceType;
  members: number;
  createdAt: string;
  dashboards: Dashboard[];
  transformations: Transformation[];
  documents: any[];
  reviews: any[];
  activity: any[];
}
