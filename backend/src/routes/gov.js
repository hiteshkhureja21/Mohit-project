/**
 * Government Data Routes
 * 
 * Endpoints:
 * - GET /api/gov/datasets       (Search or list open government datasets)
 * - GET /api/gov/datasets/:id   (Retrieve single dataset metadata)
 * - GET /api/gov/providers      (List supported government adapters and status)
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { governmentController } from '../controllers/government.controller.js';

export const govRouter = Router();

// GET /api/gov/providers - Provider listing & onboarding status
govRouter.get('/gov/providers', (req, res, next) => {
  return governmentController.getProviders(req, res, next);
});

// GET /api/gov/datasets - List/search datasets
govRouter.get('/gov/datasets', (req, res, next) => {
  return governmentController.getDatasets(req, res, next);
});

// GET /api/gov/datasets/:id - Retrieve dataset details
govRouter.get('/gov/datasets/:id', (req, res, next) => {
  return governmentController.getDatasetById(req, res, next);
});
