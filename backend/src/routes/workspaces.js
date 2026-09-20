/**
 * Workspace Management Routes
 * Enforces authentication, workspace isolation, and RBAC:
 * - GET    /api/workspaces                     -> Authenticated: lists user's authorized workspaces
 * - POST   /api/workspaces                     -> Authenticated: creates workspace, assigns creator as 'owner'
 * - GET    /api/workspaces/:id                 -> Member (viewer, editor, owner): views workspace details
 * - PATCH  /api/workspaces/:id                 -> Owner only: updates workspace settings
 * - DELETE /api/workspaces/:id                 -> Owner only: deletes workspace
 * - GET    /api/workspaces/:id/members         -> Member: views workspace team members
 * - POST   /api/workspaces/:id/members         -> Owner only: invites/adds new member
 * - DELETE /api/workspaces/:id/members/:userId -> Owner only: removes a member
 */

import { Router } from 'express';
import { env } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  requireWorkspaceMember,
  requireWorkspaceOwner
} from '../middleware/authorization.middleware.js';
import { workspaceService } from '../services/workspace.service.js';
import { workspaceMemberService } from '../services/workspaceMember.service.js';

export const workspaceRouter = Router();

// GET /api/workspaces - Lists only workspaces where user is an authorized member
workspaceRouter.get(['/workspaces', '/api/workspaces'], authMiddleware, async (req, res) => {
  const userWorkspaces = await workspaceService.listUserWorkspaces(req.user.id);

  res.json({
    success: true,
    data: userWorkspaces,
    message: 'Workspaces retrieved for authenticated user',
    timestamp: new Date().toISOString()
  });
});

// POST /api/workspaces - Creates workspace and records caller as 'owner'
workspaceRouter.post(['/workspaces', '/api/workspaces'], authMiddleware, async (req, res) => {
  const { name, description, type } = req.body || {};

  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Workspace name is required' },
      timestamp: new Date().toISOString()
    });
  }

  const newWorkspace = await workspaceService.createWorkspace({
    name: name.trim(),
    description: description || '',
    type: type || 'operations',
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    data: newWorkspace,
    message: 'Workspace created successfully with owner permissions',
    timestamp: new Date().toISOString()
  });
});

// GET /api/workspaces/:id - Member access (Viewer, Editor, Owner)
workspaceRouter.get(['/workspaces/:id', '/api/workspaces/:id'], authMiddleware, requireWorkspaceMember, async (req, res) => {
  const ws = await workspaceService.getWorkspaceById(req.params.id);
  if (!ws) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      ...ws,
      userRole: req.workspaceRole
    },
    timestamp: new Date().toISOString()
  });
});

// PATCH /api/workspaces/:id - Owner only
workspaceRouter.patch(['/workspaces/:id', '/api/workspaces/:id'], authMiddleware, requireWorkspaceOwner, async (req, res) => {
  const updated = await workspaceService.updateWorkspace(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: updated,
    message: 'Workspace updated successfully',
    timestamp: new Date().toISOString()
  });
});

// DELETE /api/workspaces/:id - Owner only
workspaceRouter.delete(['/workspaces/:id', '/api/workspaces/:id'], authMiddleware, requireWorkspaceOwner, async (req, res) => {
  await workspaceService.deleteWorkspace(req.params.id);

  res.json({
    success: true,
    data: { deletedId: req.params.id },
    message: 'Workspace deleted by owner',
    timestamp: new Date().toISOString()
  });
});

// GET /api/workspaces/:id/members - Member view
workspaceRouter.get('/workspaces/:id/members', authMiddleware, requireWorkspaceMember, async (req, res) => {
  const members = await workspaceMemberService.listMembers(req.params.id);
  res.json({
    success: true,
    data: members,
    timestamp: new Date().toISOString()
  });
});

// POST /api/workspaces/:id/members - Owner only (Editors and Viewers are DENIED with 403)
workspaceRouter.post('/workspaces/:id/members', authMiddleware, requireWorkspaceOwner, async (req, res) => {
  const { userId, role } = req.body || {};
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Target userId is required' },
      timestamp: new Date().toISOString()
    });
  }

  const added = await workspaceMemberService.addMember(req.params.id, userId, role || 'viewer');
  res.status(201).json({
    success: true,
    data: added,
    message: `Member added to workspace with role '${role || 'viewer'}'`,
    timestamp: new Date().toISOString()
  });
});

// DELETE /api/workspaces/:id/members/:userId - Owner only
workspaceRouter.delete('/workspaces/:id/members/:userId', authMiddleware, requireWorkspaceOwner, async (req, res) => {
  await workspaceMemberService.removeMember(req.params.id, req.params.userId);
  res.json({
    success: true,
    data: { removedUserId: req.params.userId },
    message: 'Member removed from workspace by owner',
    timestamp: new Date().toISOString()
  });
});
