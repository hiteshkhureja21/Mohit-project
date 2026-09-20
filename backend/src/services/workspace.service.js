/**
 * Workspace Database Service
 * Implements real PostgreSQL / Supabase operations for workspaces and memberships.
 * Fallback to in-memory dataStore when in DEMO_MODE or when database is offline.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { workspaces as inMemoryWorkspaces } from './dataStore.js';
import { workspaceMemberService } from './workspaceMember.service.js';

let lastSupabaseFailure = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 15000;

function isCircuitOpen() {
  return Date.now() - lastSupabaseFailure < CIRCUIT_BREAKER_COOLDOWN_MS;
}

function markCircuitFailure() {
  lastSupabaseFailure = Date.now();
}

function withTimeout(promise, ms = 1000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
  ]);
}

export class WorkspaceService {
  /**
   * Lists all workspaces where user is an authorized member or creator.
   */
  async listUserWorkspaces(userId) {
    if (isSupabaseConfigured() && !isCircuitOpen()) {
      const supabase = getSupabaseClient();
      try {
        // Query workspace memberships for this user
        const { data: memberRows, error: memberErr } = await withTimeout(
          supabase
            .from('workspace_members')
            .select('workspace_id, role')
            .eq('user_id', userId),
          1000
        );

        if (memberErr) {
          console.warn('[WorkspaceService] Error fetching member workspaces from Supabase:', memberErr.message);
          throw memberErr;
        }

        const workspaceIds = (memberRows || []).map(r => r.workspace_id);

        // Fetch matching workspaces (plus any created by the user)
        let query = supabase.from('workspaces').select('*');
        if (workspaceIds.length > 0) {
          query = query.or(`id.in.(${workspaceIds.map(id => `"${id}"`).join(',')}),created_by.eq."${userId}"`);
        } else {
          query = query.eq('created_by', userId);
        }

        const { data: workspaces, error: wsErr } = await query;
        if (wsErr) {
          console.warn('[WorkspaceService] Error fetching workspaces from Supabase:', wsErr.message);
          throw wsErr;
        }

        if (workspaces && workspaces.length > 0) {
          return workspaces.map(ws => ({
            id: ws.id,
            name: ws.name,
            description: ws.description || '',
            type: ws.workspace_type || 'operations',
            workspace_type: ws.workspace_type || 'operations',
            createdBy: ws.created_by,
            created_by: ws.created_by,
            createdAt: ws.created_at,
            created_at: ws.created_at,
            updatedAt: ws.updated_at,
            updated_at: ws.updated_at,
            members: 1,
            dashboards: []
          }));
        }
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.error('[WorkspaceService] Database query failed, checking fallback:', err.message);
        }
      }
    }

    // Fallback to in-memory workspaces for DEMO_MODE or when DB offline
    const allowedIds = await workspaceMemberService.getUserWorkspaceIds(userId);
    const userWorkspaces = inMemoryWorkspaces.filter(w => allowedIds.includes(w.id));
    return userWorkspaces.length > 0 ? userWorkspaces : (env.DEMO_MODE ? inMemoryWorkspaces.slice(0, 1) : []);
  }

  /**
   * Retrieves a single workspace by ID.
   */
  async getWorkspaceById(workspaceId) {
    if (isSupabaseConfigured() && !isCircuitOpen()) {
      const supabase = getSupabaseClient();
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('workspaces')
            .select('*')
            .eq('id', workspaceId)
            .single(),
          1000
        );

        if (data && !error) {
          return {
            id: data.id,
            name: data.name,
            description: data.description || '',
            type: data.workspace_type || 'operations',
            workspace_type: data.workspace_type || 'operations',
            createdBy: data.created_by,
            created_by: data.created_by,
            createdAt: data.created_at,
            created_at: data.created_at,
            updatedAt: data.updated_at,
            updated_at: data.updated_at,
            members: 1,
            dashboards: []
          };
        }
      } catch (err) {
        markCircuitFailure();
        // Fall through to in-memory store
      }
    }

    return inMemoryWorkspaces.find(w => w.id === workspaceId) || null;
  }

  /**
   * Creates a new workspace and sets the creator as owner in workspace_members.
   */
  async createWorkspace({ name, description, type, userId }) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const payload = {
          name: name.trim(),
          description: description || '',
          workspace_type: type || 'operations',
          created_by: userId
        };

        const { data: newWs, error: wsError } = await supabase
          .from('workspaces')
          .insert(payload)
          .select('*')
          .single();

        if (wsError) {
          console.warn('[WorkspaceService] Supabase insert failed:', wsError.message);
          throw wsError;
        }

        if (newWs) {
          // Register creator in workspace_members
          await supabase.from('workspace_members').insert({
            workspace_id: newWs.id,
            user_id: userId,
            role: 'owner'
          });

          return {
            id: newWs.id,
            name: newWs.name,
            description: newWs.description || '',
            type: newWs.workspace_type || 'operations',
            workspace_type: newWs.workspace_type || 'operations',
            createdBy: newWs.created_by,
            created_by: newWs.created_by,
            createdAt: newWs.created_at,
            created_at: newWs.created_at,
            members: 1,
            dashboards: []
          };
        }
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.warn('[WorkspaceService] Failed to insert to Supabase, writing to in-memory store:', err.message);
        }
      }
    }

    // In-memory fallback
    const newWs = {
      id: `workspace-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      description: description || '',
      type: type || 'operations',
      members: 1,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      dashboards: []
    };

    inMemoryWorkspaces.unshift(newWs);
    await workspaceMemberService.addMember(newWs.id, userId, 'owner');
    return newWs;
  }

  /**
   * Updates an existing workspace.
   */
  async updateWorkspace(workspaceId, updates) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const payload = {};
        if (updates.name) payload.name = updates.name.trim();
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.type) payload.workspace_type = updates.type;

        const { data, error } = await supabase
          .from('workspaces')
          .update(payload)
          .eq('id', workspaceId)
          .select('*')
          .single();

        if (data && !error) {
          return {
            id: data.id,
            name: data.name,
            description: data.description,
            type: data.workspace_type,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        // Fall through
      }
    }

    const index = inMemoryWorkspaces.findIndex(w => w.id === workspaceId);
    if (index >= 0) {
      inMemoryWorkspaces[index] = {
        ...inMemoryWorkspaces[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return inMemoryWorkspaces[index];
    }
    return null;
  }

  /**
   * Deletes a workspace.
   */
  async deleteWorkspace(workspaceId) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const { error } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', workspaceId);

        if (!error) return true;
      } catch (err) {
        // Fall through
      }
    }

    const index = inMemoryWorkspaces.findIndex(w => w.id === workspaceId);
    if (index >= 0) {
      inMemoryWorkspaces.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const workspaceService = new WorkspaceService();
