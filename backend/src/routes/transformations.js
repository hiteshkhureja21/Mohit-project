/**
 * Transformation Pipeline Routes
 * Endpoints for the 6-stage transformation workflow:
 * - POST  /api/transformations                      (Stage 1: Source)
 * - GET   /api/transformations/:id                  (Stage 1: Retrieve)
 * - GET   /api/transformations                      (List by workspace)
 * - PATCH /api/transformations/:id/audience         (Stage 2: Audience)
 * - PATCH /api/transformations/:id/outputs-config   (Stage 3: Output Config)
 * - POST  /api/transformations/:id/generate         (Stage 4: AI Generation)
 * - GET   /api/transformations/:id/review           (Stage 5: Claims & Review)
 * - PATCH /api/transformations/:id/claims/:claimId  (Stage 5: Claim Update)
 * - POST  /api/transformations/:id/approve          (Stage 5: Approval)
 * - POST  /api/transformations/:id/prepare-delivery (Stage 6: Final Delivery Prep)
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  requireWorkspaceMember,
  requireWorkspaceEditor
} from '../middleware/authorization.middleware.js';
import { transformationController } from '../controllers/transformation.controller.js';

export const transformationRouter = Router();

// Stage 1: Initialize transformation (Editor/Owner)
transformationRouter.post(
  '/transformations',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.create(req, res)
);

// Retrieve transformation (Member)
transformationRouter.get(
  '/transformations/:id',
  authMiddleware,
  requireWorkspaceMember,
  (req, res) => transformationController.getById(req, res)
);

// List transformations (Member)
transformationRouter.get(
  '/transformations',
  authMiddleware,
  requireWorkspaceMember,
  (req, res) => transformationController.list(req, res)
);

// Stage 2: Store audience config (Editor/Owner)
transformationRouter.patch(
  '/transformations/:id/audience',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.updateAudience(req, res)
);

// Stage 3: Store output format options (Editor/Owner)
transformationRouter.patch(
  '/transformations/:id/outputs-config',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.updateOutputsConfig(req, res)
);

// Stage 4: Run AI Generation & Claim Grounding (Editor/Owner)
transformationRouter.post(
  '/transformations/:id/generate',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.generate(req, res)
);

// Stage 5: Get claims and review data (Member)
transformationRouter.get(
  '/transformations/:id/review',
  authMiddleware,
  requireWorkspaceMember,
  (req, res) => transformationController.getReview(req, res)
);

// Stage 5: Update a claim's status or phrasing (Editor/Owner)
transformationRouter.patch(
  '/transformations/:id/claims/:claimId',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.updateClaim(req, res)
);

// Stage 5: Human sign-off / approval gate (Editor/Owner)
transformationRouter.post(
  '/transformations/:id/approve',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.approve(req, res)
);

// Stage 6: Prepare final deliverables for delivery (Editor/Owner)
transformationRouter.post(
  '/transformations/:id/prepare-delivery',
  authMiddleware,
  requireWorkspaceEditor,
  (req, res) => transformationController.prepareDelivery(req, res)
);
