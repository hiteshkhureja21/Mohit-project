/**
 * Translation Routes
 * 
 * Endpoints:
 * - POST /api/translate             (Translate text or file content)
 * - GET  /api/translate             (List translation history with filtering & pagination)
 * - GET  /api/translate/languages   (List supported translation languages)
 * - GET  /api/translate/:id         (Retrieve translation record by ID)
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, translateRequestSchema } from '../middleware/validation.middleware.js';
import { translationController } from '../controllers/translation.controller.js';

export const translateRouter = Router();

// GET /api/translate/languages - List supported languages (open catalog)
translateRouter.get('/translate/languages', (req, res, next) => {
  return translationController.getSupportedLanguages(req, res, next);
});

// POST /api/translate - Execute translation (requires auth, editor/owner role)
translateRouter.post('/translate', authMiddleware, validateBody(translateRequestSchema), (req, res, next) => {
  return translationController.translate(req, res, next);
});

// GET /api/translate - List translation records (requires auth, workspace isolation)
translateRouter.get('/translate', authMiddleware, (req, res, next) => {
  return translationController.listTranslations(req, res, next);
});

// GET /api/translate/:id - Retrieve single translation record (requires auth, workspace verification)
translateRouter.get('/translate/:id', authMiddleware, (req, res, next) => {
  return translationController.getTranslationById(req, res, next);
});
