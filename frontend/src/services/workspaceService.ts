import { Workspace, Dashboard, WorkspaceType, DashboardType } from '../types/workspace';
import { initialTransformation, mockDocumentsList } from '../data/demoData';
import { isDemoMode } from '../config/supabase';
import { simulateDelay, createApiResponse, ApiResponse, apiClient } from './api';

const WORKSPACE_STORAGE_KEY = 'sourceflow_workspaces';
const ACTIVE_WORKSPACE_KEY = 'sourceflow_active_workspace_id';
const ACTIVE_DASHBOARD_KEY = 'sourceflow_active_dashboard_id';

export const initialDashboardsOps: Dashboard[] = [
  {
    id: 'dashboard-001',
    workspaceId: 'workspace-001',
    name: 'Operations Overview',
    description: 'Monitor transformations, reviews and deliveries.',
    type: 'operations',
    modules: ['transformations', 'reviews', 'documents', 'activity', 'deliveries'],
    createdAt: '2026-09-01T09:00:00Z'
  },
  {
    id: 'dashboard-002',
    workspaceId: 'workspace-001',
    name: 'Verification Center',
    description: 'Review claims and source evidence.',
    type: 'verification',
    modules: ['claims', 'evidence', 'reviews'],
    createdAt: '2026-09-02T10:30:00Z'
  },
  {
    id: 'dashboard-003',
    workspaceId: 'workspace-001',
    name: 'Communication Studio',
    description: 'Manage generated communication outputs.',
    type: 'communications',
    modules: ['outputs', 'deliveries', 'templates'],
    createdAt: '2026-09-03T14:15:00Z'
  }
];

export const initialDashboardsIntel: Dashboard[] = [
  {
    id: 'dashboard-004',
    workspaceId: 'workspace-002',
    name: 'Research & Briefings',
    description: 'Deep investigative research summaries and cross-agency briefs.',
    type: 'research',
    modules: ['documents', 'transformations', 'activity'],
    createdAt: '2026-09-04T11:00:00Z'
  }
];

export const initialWorkspacesList: Workspace[] = [
  {
    id: 'workspace-001',
    name: 'SourceFlow Operations',
    description: 'Content Transformation & Verification',
    type: 'operations',
    members: 3,
    createdAt: '2026-08-15T08:00:00Z',
    dashboards: initialDashboardsOps,
    transformations: [initialTransformation],
    documents: mockDocumentsList,
    reviews: [
      {
        id: 'REV-001',
        title: 'Cybersecurity Threat Intelligence Research Report.pdf',
        unsupportedCount: 2,
        status: 'Needs Review',
        updatedAt: '10:42 AM Today'
      }
    ],
    activity: initialTransformation.audit
  },
  {
    id: 'workspace-002',
    name: 'Content Intelligence',
    description: 'Research & Communication',
    type: 'communications',
    members: 5,
    createdAt: '2026-08-20T11:30:00Z',
    dashboards: initialDashboardsIntel,
    transformations: [],
    documents: [],
    reviews: [],
    activity: []
  }
];

export class WorkspaceService {
  private workspaces: Workspace[] = [];

  constructor() {
    this.loadWorkspaces();
  }

  private loadWorkspaces() {
    if (!isDemoMode()) {
      this.workspaces = [];
      return;
    }
    try {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored) {
        this.workspaces = JSON.parse(stored);
      } else {
        this.workspaces = [...initialWorkspacesList];
        this.saveWorkspaces();
      }
    } catch {
      this.workspaces = [...initialWorkspacesList];
    }
  }

  private saveWorkspaces() {
    if (!isDemoMode()) return;
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(this.workspaces));
    } catch (err) {
      console.warn('Could not save workspaces to storage', err);
    }
  }

  async getWorkspaces(): Promise<ApiResponse<Workspace[]>> {
    const fallback = isDemoMode() ? [...this.workspaces] : undefined;
    const res = await apiClient.get<Workspace[]>('/workspaces', fallback);
    if (res.success && res.data) {
      if (res.data.length === 0) {
        return createApiResponse([]);
      }
      // Merge with local dashboards if backend returns light objects
      const merged = res.data.map(ws => {
        const local = this.workspaces.find(l => l.id === ws.id);
        return {
          ...ws,
          dashboards: ws.dashboards && ws.dashboards.length > 0 ? ws.dashboards : (local?.dashboards || (isDemoMode() ? initialDashboardsOps : [])),
          transformations: local?.transformations || (isDemoMode() ? [initialTransformation] : []),
          documents: local?.documents || (isDemoMode() ? mockDocumentsList : []),
          reviews: local?.reviews || [],
          activity: local?.activity || []
        };
      });
      this.workspaces = merged;
      if (isDemoMode()) {
        this.saveWorkspaces();
      }
      return createApiResponse(merged);
    }
    if (isDemoMode()) {
      return createApiResponse([...this.workspaces]);
    }
    return res;
  }

  async getWorkspaceById(id: string): Promise<ApiResponse<Workspace | null>> {
    const local = this.workspaces.find(w => w.id === id) || null;
    const fallback = isDemoMode() ? (local as any) : undefined;
    const res = await apiClient.get<Workspace>(`/workspaces/${id}`, fallback);
    if (res.success && res.data) {
      return res as ApiResponse<Workspace>;
    }
    if (isDemoMode()) {
      return createApiResponse(local);
    }
    return res;
  }

  async createWorkspace(payload: {
    name: string;
    description: string;
    type: WorkspaceType;
  }): Promise<ApiResponse<Workspace>> {
    const newWsId = `workspace-${Date.now()}`;
    const defaultDash: Dashboard = {
      id: `dashboard-${Date.now()}`,
      workspaceId: newWsId,
      name: 'Operations Overview',
      description: 'Default operations hub.',
      type: 'operations',
      modules: ['transformations', 'reviews', 'documents', 'activity'],
      createdAt: new Date().toISOString()
    };

    const localNewWorkspace: Workspace = {
      id: newWsId,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      members: 1,
      createdAt: new Date().toISOString(),
      dashboards: [defaultDash],
      transformations: [],
      documents: [],
      reviews: [],
      activity: []
    };

    const fallback = isDemoMode() ? localNewWorkspace : undefined;
    const res = await apiClient.post<Workspace>('/workspaces', payload, fallback);
    const finalWs = {
      ...localNewWorkspace,
      ...(res.data || {}),
      dashboards: [defaultDash]
    };

    this.workspaces.push(finalWs);
    if (isDemoMode()) {
      this.saveWorkspaces();
    }
    return createApiResponse(finalWs, 'Workspace created');
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<ApiResponse<Workspace>> {
    const existing = this.workspaces.find(w => w.id === id);
    const updated = { ...(existing || {}), ...updates } as Workspace;
    
    const fallback = isDemoMode() ? updated : undefined;
    await apiClient.patch(`/workspaces/${id}`, updates, fallback);
    this.workspaces = this.workspaces.map(w => w.id === id ? updated : w);
    if (isDemoMode()) {
      this.saveWorkspaces();
    }
    return createApiResponse(updated);
  }

  async getDashboards(workspaceId: string): Promise<ApiResponse<Dashboard[]>> {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    return createApiResponse(ws ? ws.dashboards : []);
  }

  async createDashboard(
    workspaceId: string,
    payload: {
      name: string;
      description: string;
      type: DashboardType;
      modules: string[];
    }
  ): Promise<ApiResponse<Dashboard>> {
    await simulateDelay(100);
    const newDash: Dashboard = {
      id: `dashboard-${Date.now()}`,
      workspaceId,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      modules: payload.modules.length > 0 ? payload.modules : ['transformations', 'reviews', 'documents'],
      createdAt: new Date().toISOString()
    };

    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (ws) {
      ws.dashboards.push(newDash);
      this.saveWorkspaces();
    }

    return createApiResponse(newDash, 'Dashboard created');
  }

  getActiveWorkspaceId(): string | null {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  }

  setActiveWorkspaceId(id: string) {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  }

  getActiveDashboardId(): string | null {
    return localStorage.getItem(ACTIVE_DASHBOARD_KEY);
  }

  setActiveDashboardId(id: string) {
    localStorage.setItem(ACTIVE_DASHBOARD_KEY, id);
  }

  clearActive() {
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    localStorage.removeItem(ACTIVE_DASHBOARD_KEY);
  }
}

export const workspaceService = new WorkspaceService();
