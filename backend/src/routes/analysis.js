/**
 * Analysis & Transformation Pipeline Routes
 * Enforces workspace isolation and RBAC:
 * - POST  /api/analysis/run          -> Editor / Owner (Viewer DENIED with 403)
 * - GET   /api/analysis/:id          -> Member
 * - POST  /api/transform             -> Editor / Owner (Viewer DENIED with 403)
 * - GET   /api/transform/:id         -> Member
 * - PATCH /api/transform/:id         -> Editor / Owner
 * - POST  /api/transform/:id/verify  -> Editor / Owner
 * - POST  /api/transform/:id/approve -> Editor / Owner
 */

import { Router } from 'express';
import { env } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  requireWorkspaceMember,
  requireWorkspaceEditor
} from '../middleware/authorization.middleware.js';
import { documents, claims } from '../services/dataStore.js';
import { aiPipelineService } from '../services/ai/aiPipeline.service.js';

export const analysisRouter = Router();

// POST /api/analysis/run - Execution requires Editor or Owner (Viewers DENIED)
analysisRouter.post('/analysis/run', authMiddleware, requireWorkspaceEditor, async (req, res) => {
  try {
    const { documentId, fileId, text, model } = req.body || {};
    const result = await aiPipelineService.runAnalysis({
      fileId: fileId || documentId,
      documentId: documentId || fileId,
      text,
      workspaceId: req.workspaceId,
      userId: req.user?.id,
      model
    });

    return res.json({
      success: true,
      data: result,
      message: 'Analysis completed successfully under workspace authority',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'AI_ANALYSIS_FAILED', message: err.message },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/analysis/:id - Member access
analysisRouter.get('/analysis/:id', authMiddleware, requireWorkspaceMember, (req, res) => {
  res.json({
    success: true,
    data: { id: req.params.id, status: 'COMPLETE', progress: 100 },
    timestamp: new Date().toISOString()
  });
});

import { transformationController } from '../controllers/transformation.controller.js';

// POST /api/transform - Starting a transformation requires Editor or Owner
analysisRouter.post('/transform', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return transformationController.create(req, res);
});

// GET /api/transform/:id - Member access
analysisRouter.get('/transform/:id', authMiddleware, requireWorkspaceMember, (req, res) => {
  return transformationController.getById(req, res);
});

// PATCH /api/transform/:id - Editor or Owner only
analysisRouter.patch('/transform/:id', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return transformationController.updateAudience(req, res);
});

// POST /api/transform/:id/verify - Editor or Owner only
analysisRouter.post('/transform/:id/verify', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return transformationController.getReview(req, res);
});

// POST /api/transform/:id/approve - Editor or Owner only
analysisRouter.post('/transform/:id/approve', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return transformationController.approve(req, res);
});
