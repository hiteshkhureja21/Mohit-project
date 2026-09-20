/**
 * Workspace Member & Access Control Service
 * Resolves user membership, roles, and authorization in workspaces.
 * Interacts with Supabase PostgreSQL workspace_members, with DEMO_MODE support.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { workspaces } from './dataStore.js';

// In-memory membership table for DEMO_MODE and testing
export let demoMemberships = [
  { workspaceId: 'workspace-001', userId: 'USR-802', role: 'owner' },
  { workspaceId: 'workspace-001', userId: 'USR-EDITOR-1', role: 'editor' },
  { workspaceId: 'workspace-001', userId: 'USR-VIEWER-1', role: 'viewer' },
  { workspaceId: 'workspace-002', userId: 'USR-USER-B', role: 'owner' },
  { workspaceId: 'workspace-002', userId: 'USR-VIEWER-2', role: 'viewer' }
];

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

export class WorkspaceMemberService {
  /**
   * Retrieves a user's role in a specific workspace.
   * Returns 'owner' | 'editor' | 'viewer' | null
   */
  async getMemberRole(workspaceId, userId) {
    if (!workspaceId || !userId) return null;

    // 1. Check Supabase database if configured and circuit breaker is closed
    if (isSupabaseConfigured() && !isCircuitOpen()) {
      const supabase = getSupabaseClient();
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .single(),
          1000
        );

        if (!error && data?.role) {
          return data.role;
        }
      } catch (err) {
        markCircuitFailure();
        if (!env.DEMO_MODE) {
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    // 2. Demo mode membership lookup (Single source of truth: demoMemberships)
    const membership = demoMemberships.find(
      m => m.workspaceId === workspaceId && m.userId === userId
    );

    if (membership) {
      return membership.role;
    }

    return null;
  }

  /**
   * Returns whether a user is a member of the workspace.
   */
  async isMember(workspaceId, userId) {
    const role = await this.getMemberRole(workspaceId, userId);
    return role !== null;
  }

  /**
   * Lists all members of a workspace.
   */
  async listMembers(workspaceId) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          role,
          created_at,
          user:profiles(id, display_name, avatar_url, role, designation)
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw new Error(error.message);
      return data;
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    // Demo mode list
    return demoMemberships
      .filter(m => m.workspaceId === workspaceId)
      .map(m => ({
        id: `mem-${m.userId}`,
        workspaceId: m.workspaceId,
        userId: m.userId,
        role: m.role,
        createdAt: new Date().toISOString()
      }));
  }

  /**
   * Adds a member to a workspace (Owner-only action).
   */
  async addMember(workspaceId, userId, role) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: userId,
            role: role || 'viewer'
          })
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.warn('[WorkspaceMemberService] Supabase addMember error:', err.message);
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    const existingIdx = demoMemberships.findIndex(
      m => m.workspaceId === workspaceId && m.userId === userId
    );

    if (existingIdx !== -1) {
      demoMemberships[existingIdx].role = role;
      return demoMemberships[existingIdx];
    }

    const newMembership = { workspaceId, userId, role: role || 'viewer' };
    demoMemberships.push(newMembership);
    return newMembership;
  }

  async removeMember(workspaceId, userId) {
    // 1. Last owner protection check
    const target = demoMemberships.find(m => m.workspaceId === workspaceId && m.userId === userId);
    if (target && target.role === 'owner') {
      const remainingOwners = demoMemberships.filter(
        m => m.workspaceId === workspaceId && m.role === 'owner' && m.userId !== userId
      );
      if (remainingOwners.length === 0) {
        const err = new Error('Cannot remove the last owner. Every workspace must have at least one active owner.');
        err.statusCode = 400;
        err.code = 'LAST_OWNER_PROTECTED';
        throw err;
      }
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const { error } = await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId);

        if (!error) return true;
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.warn('[WorkspaceMemberService] Supabase removeMember error:', err.message);
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    const idx = demoMemberships.findIndex(
      m => m.workspaceId === workspaceId && m.userId === userId
    );
    if (idx !== -1) {
      demoMemberships.splice(idx, 1);
    }
    return true;
  }

  /**
   * Returns all workspace IDs that a user is allowed to access.
   */
  async getUserWorkspaceIds(userId) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', userId);

        if (!error && data) {
          return data.map(d => d.workspace_id);
        }
      } catch (err) {
        if (!env.DEMO_MODE) {
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    return demoMemberships
      .filter(m => m.userId === userId)
      .map(m => m.workspaceId);
  }
}

export const workspaceMemberService = new WorkspaceMemberService();
