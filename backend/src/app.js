/**
 * Express Application Setup
 * Registers security middleware, rate limiting, routes, and error handling.
 */

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { isSupabaseConfigured } from './config/supabase.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requestLogger, requestIdMiddleware } from './utils/logger.js';
import {
  apiLimiter,
  authLimiter,
  aiLimiter,
  ocrLimiter,
  uploadLimiter,
  translateLimiter
} from './middleware/rateLimit.middleware.js';

// Route modules
import { authRouter } from './routes/auth.js';
import { workspaceRouter } from './routes/workspaces.js';
import { fileRouter } from './routes/files.js';
import { documentRouter } from './routes/documents.js';
import { analysisRouter } from './routes/analysis.js';
import { claimRouter } from './routes/claims.js';
import { outputRouter } from './routes/outputs.js';
import { deliveryRouter } from './routes/delivery.js';
import { auditRouter } from './routes/audit.js';
import { ocrRouter } from './routes/ocr.js';
import { aiRouter } from './routes/ai.js';
import { transformationRouter } from './routes/transformations.js';
import { translateRouter } from './routes/translate.js';
import { govRouter } from './routes/gov.js';

export function createApp() {
  const app = express();
  const isProduction = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

  // 1. Trust proxy when behind reverse proxies (ALB / Cloudflare / Nginx)
  app.set('trust proxy', 1);

  // 2. Assign or propagate structured Request ID (e.g. req_8a91f3)
  app.use(requestIdMiddleware);

  // 2. Strict CORS configuration
  const allowedOrigins = new Set([
    env.FRONTEND_URL,
    ...(Array.isArray(env.ALLOWED_ORIGINS) ? env.ALLOWED_ORIGINS : []),
    ...(isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])
  ].filter(Boolean));

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without Origin header (e.g. mobile apps, server-to-server, unit tests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        // In non-production only, allow arbitrary localhost development ports
        if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }

        // In production, reject any non-whitelisted origin
        const corsError = new Error(`CORS policy violation: Origin '${origin}' is not permitted.`);
        corsError.status = 403;
        corsError.code = 'CORS_REJECTED';
        return callback(corsError);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'Accept', 'X-Requested-With']
    })
  );

  // 3. Security response headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // 4. Sanitized request logger
  app.use(requestLogger);

  // 5. Body parsers with size limits
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // 6. Global API Rate Limiter
  app.use('/api', apiLimiter);

  // 7. Route-specific Rate Limiters
  app.use('/api/auth', authLimiter);
  app.use('/api/ai', aiLimiter);
  app.use('/api/ocr', ocrLimiter);
  app.use('/api/files', uploadLimiter);
  app.use('/api/translate', translateLimiter);

  // Health check endpoint (exempt from sensitive limits)
  app.get('/api/health', (req, res) => {
    const dbConfigured = isSupabaseConfigured();
    const isProd = !env.DEMO_MODE;
    
    const dbStatus = dbConfigured ? 'supabase-postgresql' : (env.DEMO_MODE ? 'in-memory-demo' : 'not_configured');
    const storageStatus = (dbConfigured && Boolean(env.SUPABASE_SERVICE_ROLE_KEY)) ? 'supabase-storage' : (env.DEMO_MODE ? 'local-disk-demo' : 'not_configured');
    const aiStatus = Boolean(env.OPENAI_API_KEY) ? 'openai' : 'not_configured';
    const ocrStatus = Boolean(env.OCR_API_KEY) ? 'ocr-space' : 'direct-extract';
    const translationStatus = Boolean(env.LIBRETRANSLATE_URL) ? 'libretranslate' : (env.DEMO_MODE ? 'simulated' : 'not_configured');

    const isHealthy = dbConfigured && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
    const overallStatus = isHealthy ? 'healthy' : (isProd ? 'degraded' : 'healthy_demo');

    res.json({
      success: true,
      status: overallStatus,
      version: '1.0.0',
      environment: env.NODE_ENV,
      demoMode: env.DEMO_MODE,
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: dbStatus,
        storage: storageStatus,
        ai: aiStatus,
        ocr: ocrStatus,
        translation: translationStatus
      },
      timestamp: new Date().toISOString()
    });
  });

  // 8. Mount modular routes
  app.use('/api', authRouter);
  app.use('/', authRouter); // Also mount at root so both /auth/* and /api/auth/* are supported
  app.use('/api', workspaceRouter);
  app.use('/api', fileRouter);
  app.use('/api', documentRouter);
  app.use('/api', analysisRouter);
  app.use('/api', claimRouter);
  app.use('/api', outputRouter);
  app.use('/api', deliveryRouter);
  app.use('/api', auditRouter);
  app.use('/api', ocrRouter);
  app.use('/api', aiRouter);
  app.use('/api', transformationRouter);
  app.use('/api', translateRouter);
  app.use('/api', govRouter);

  // 9. 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
      },
      timestamp: new Date().toISOString()
    });
  });

  // 10. Centralized application error handler
  app.use(errorMiddleware);

  return app;
}
