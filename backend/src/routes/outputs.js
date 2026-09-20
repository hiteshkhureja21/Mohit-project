/**
 * Output Deliverables Generation & Approval Routes
 * Endpoints:
 * - POST /api/outputs/generate
 * - POST /api/outputs/:id/approve
 */

import { Router } from 'express';
import { env } from '../config/env.js';
import { aiPipelineService } from '../services/ai/aiPipeline.service.js';

export const outputRouter = Router();

// POST /api/outputs/generate
outputRouter.post('/outputs/generate', async (req, res) => {
  try {
    const { transformationId, fileId, documentId, profiles, text, model } = req.body || {};
    const deliverables = await aiPipelineService.generateDeliverables(
      {
        transformationId,
        fileId: fileId || documentId || transformationId,
        text,
        model
      },
      { profiles }
    );

    return res.json({
      success: true,
      data: deliverables,
      message: 'Outputs generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'AI_GENERATION_FAILED', message: err.message },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/outputs/:id/approve
outputRouter.post('/outputs/:id/approve', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      status: 'APPROVED',
      approved_at: new Date().toISOString()
    },
    message: 'Output signed and approved',
    timestamp: new Date().toISOString()
  });
});
