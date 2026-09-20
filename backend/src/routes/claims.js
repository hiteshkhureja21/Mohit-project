/**
 * Claims Matrix & Grounding Verification Routes
 * 
 * Endpoints:
 * - GET    /api/claims           (List claims, filterable by transformationId / status)
 * - GET    /api/claims/:id       (Single claim by ID)
 * - POST   /api/claims/verify    (Evaluate grounding against source text)
 * - PATCH  /api/claims/:id       (Update claim status, phrasing, reviewer note)
 * - DELETE /api/claims/:id       (Remove claim from scope)
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  requireWorkspaceMember,
  requireWorkspaceEditor
} from '../middleware/authorization.middleware.js';
import { validateBody, claimVerifySchema } from '../middleware/validation.middleware.js';
import { claimController } from '../controllers/claim.controller.js';

export const claimRouter = Router();

// GET /api/claims - Read claims (Member access)
claimRouter.get('/claims', authMiddleware, requireWorkspaceMember, (req, res) => {
  return claimController.getClaims(req, res);
});

// GET /api/claims/:id - Read single claim (Member access)
claimRouter.get('/claims/:id', authMiddleware, requireWorkspaceMember, (req, res) => {
  return claimController.getById(req, res);
});

// POST /api/claims/verify - Verify claim grounding against text (Editor access)
claimRouter.post('/claims/verify', authMiddleware, requireWorkspaceEditor, validateBody(claimVerifySchema), (req, res) => {
  return claimController.verify(req, res);
});

// PATCH /api/claims/:id - Update status / edit phrasing (Editor access)
claimRouter.patch('/claims/:id', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return claimController.update(req, res);
});

// DELETE /api/claims/:id - Delete claim from scope (Editor access)
claimRouter.delete('/claims/:id', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return claimController.delete(req, res);
});
