/**
 * Authorization Middleware
 * Enforces workspace-level isolation and Role-Based Access Control (RBAC).
 * 
 * Hierarchy:
 * - OWNER:  Full control, member management, workspace deletion, content updates, file deletion.
 * - EDITOR: Upload files, transform files, execute AI, update content. (Cannot manage members or delete workspace).
 * - VIEWER: Read-only access to files and results. (Cannot upload, transform, execute AI, or manage members).
 */

import { authMiddleware } from './auth.js';
import { workspaceMemberService } from '../services/workspaceMember.service.js';
import { storageService } from '../services/files/storage.service.js';
import { ForbiddenError, BadRequestError, ErrorCodes } from '../utils/errors.js';
import { env } from '../config/env.js';

const ROLE_LEVELS = {
  viewer: 1,
  editor: 2,
  owner: 3
};

/**
 * Extracts workspace ID from request params, query, headers, or body.
 */
export function extractWorkspaceId(req) {
  if (req.params?.workspaceId) {
    return req.params.workspaceId;
  }

  // When accessing workspace resource directly (/api/workspaces/:id or /workspaces/:id)
  if (
    req.params?.id &&
    (req.baseUrl?.includes('workspaces') ||
     req.path?.includes('workspaces') ||
     req.originalUrl?.includes('workspaces'))
  ) {
    return req.params.id;
  }

  const explicit =
    req.query?.workspaceId ||
    req.headers?.['x-workspace-id'] ||
    (req.body ? req.body.workspaceId : null);

  if (explicit) {
    return explicit;
  }

  // Fallback to first workspace for legacy single-workspace routes in DEMO_MODE
  if (env?.DEMO_MODE) {
    return 'workspace-001';
  }

  return null;
}

/**
 * Middleware factory requiring user to hold at least a specified role in the target workspace.
 * Returns 403 Forbidden if not a member or role is insufficient.
 */
export function requireWorkspaceRole(minRole = 'viewer') {
  return async (req, res, next) => {
    // 1. Ensure user is authenticated first
    if (!req.user) {
      return authMiddleware(req, res, async () => {
        await enforceRole(req, res, next, minRole);
      });
    }

    await enforceRole(req, res, next, minRole);
  };
}

async function enforceRole(req, res, next, minRole) {
  let workspaceId = extractWorkspaceId(req);

  // If operation is scoped to a specific file ID but workspaceId is not explicitly passed in headers/query
  const isFileRoute = Boolean(
    req.params?.id &&
    (req.baseUrl?.includes('files') || req.path?.includes('files') || req.originalUrl?.includes('files'))
  );

  if (isFileRoute) {
    try {
      const file = await storageService.getFileById(req.params.id);
      if (file) {
        const fileWs = file.workspace_id || file.workspaceId;
        if (workspaceId && fileWs !== workspaceId) {
          return next(new ForbiddenError(
            `Access denied. Target file does not belong to workspace '${workspaceId}'.`,
            ErrorCodes.ACCESS_DENIED
          ));
        }
        workspaceId = fileWs;
      }
    } catch {}
  }

  if (!workspaceId) {
    return next(new BadRequestError('A valid workspaceId is required for this operation.', 'WORKSPACE_REQUIRED'));
  }

  const userRole = await workspaceMemberService.getMemberRole(workspaceId, req.user.id);

  // 1. Check membership
  if (!userRole) {
    return next(new ForbiddenError(
      `Access denied. You do not belong to workspace '${workspaceId}'.`,
      ErrorCodes.ACCESS_DENIED
    ));
  }

  // 2. Check role hierarchy
  const userLevel = ROLE_LEVELS[userRole.toLowerCase()] || 0;
  const requiredLevel = ROLE_LEVELS[minRole.toLowerCase()] || 1;

  if (userLevel < requiredLevel) {
    return next(new ForbiddenError(
      `Insufficient workspace permissions. Required role: '${minRole}', your role: '${userRole}'.`,
      ErrorCodes.ACCESS_DENIED
    ));
  }

  // Attach resolved context to request
  req.workspaceId = workspaceId;
  req.workspaceRole = userRole.toLowerCase();

  next();
}

/**
 * Read-only access: owner, editor, viewer
 */
export const requireWorkspaceMember = requireWorkspaceRole('viewer');

/**
 * Content modification: owner, editor
 */
export const requireWorkspaceEditor = requireWorkspaceRole('editor');

/**
 * Administrative control: owner only
 */
export const requireWorkspaceOwner = requireWorkspaceRole('owner');
