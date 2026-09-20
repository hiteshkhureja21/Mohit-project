/**
 * Distribution & Delivery Center Routes
 * Endpoints:
 * - POST /api/delivery/send
 */

import { Router } from 'express';
import { env } from '../config/env.js';

export const deliveryRouter = Router();

// POST /api/delivery/send
deliveryRouter.post('/delivery/send', (req, res) => {
  if (!env.DEMO_MODE) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DELIVERY_SERVICE_NOT_CONFIGURED',
        message: 'Real delivery dispatch service is not configured. Set DEMO_MODE=true for simulated delivery dispatch.'
      },
      timestamp: new Date().toISOString()
    });
  }

  const { recipients, subject } = req.body || {};

  res.json({
    success: true,
    data: {
      delivery_id: `DEL-${Date.now().toString().slice(-4)}`,
      status: 'SENT',
      recipients: recipients || [],
      subject: subject || 'SourceFlow Verified Deliverable',
      sent_at: new Date().toISOString()
    },
    message: 'Deliverables dispatched successfully',
    timestamp: new Date().toISOString()
  });
});
