/**
 * AI Service Routes
 * STEP 7: Official OpenAI Integration Routes
 * 
 * Endpoints:
 * - POST /api/ai/summarize  -> Executive summary
 * - POST /api/ai/analyze    -> Full structured analysis
 * - POST /api/ai/extract    -> Claims and dates extraction
 * - POST /api/ai/generate   -> Audience deliverables
 * - GET  /api/ai/requests   -> Audit log of AI queries
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiController } from '../controllers/ai.controller.js';

export const aiRouter = Router();

// POST /api/ai/summarize - Executive summary
aiRouter.post('/ai/summarize', authMiddleware, (req, res) => {
  return aiController.summarize(req, res);
});

// POST /api/ai/analyze - Full structured analysis
aiRouter.post('/ai/analyze', authMiddleware, (req, res) => {
  return aiController.analyze(req, res);
});

// POST /api/ai/extract - Extract claims and dates
aiRouter.post('/ai/extract', authMiddleware, (req, res) => {
  return aiController.extract(req, res);
});

// POST /api/ai/generate - Audience deliverables
aiRouter.post('/ai/generate', authMiddleware, (req, res) => {
  return aiController.generate(req, res);
});

// GET /api/ai/requests - Audit log of AI queries
aiRouter.get('/ai/requests', authMiddleware, (req, res) => {
  return aiController.getRequests(req, res);
});

export default aiRouter;
