/**
 * Cryptographic Audit Ledger Routes
 * Endpoints:
 * - GET /api/audit
 */

import { Router } from 'express';
import { env } from '../config/env.js';
import { auditRecords } from '../services/dataStore.js';

export const auditRouter = Router();

// GET /api/audit
auditRouter.get('/audit', (req, res) => {
  res.json({
    success: true,
    data: env.DEMO_MODE ? auditRecords : [],
    message: 'Audit trail retrieved',
    timestamp: new Date().toISOString()
  });
});
