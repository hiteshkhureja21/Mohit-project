/**
 * File Ingestion & Storage Routes
 * Integrates FileController with real Supabase Storage & local storage:
 * - POST   /api/files             -> Editor / Owner
 * - POST   /api/files/upload      -> Editor / Owner (alias for frontend compatibility)
 * - GET    /api/files             -> Member
 * - GET    /api/files/:id         -> Member
 * - GET    /api/files/:id/download-> Member (streams real file binary or redirects to signed URL)
 * - DELETE /api/files/:id         -> Editor / Owner
 */

import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import {
  requireWorkspaceMember,
  requireWorkspaceEditor
} from '../middleware/authorization.middleware.js';
import { fileController } from '../controllers/file.controller.js';
import { env } from '../config/env.js';

export const fileRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES }
});

// Multer error handling wrapper for oversized files
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds the configured ${env.MAX_FILE_SIZE_MB}MB limit.`
          },
          timestamp: new Date().toISOString()
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
    next();
  });
};

// POST /api/files - Upload file
fileRouter.post('/files', authMiddleware, handleUpload, requireWorkspaceEditor, (req, res) => {
  return fileController.upload(req, res);
});

// POST /api/files/upload - Upload file (alias for backward compatibility)
fileRouter.post('/files/upload', authMiddleware, handleUpload, requireWorkspaceEditor, (req, res) => {
  return fileController.upload(req, res);
});

// GET /api/files - List files in workspace
fileRouter.get('/files', authMiddleware, requireWorkspaceMember, (req, res) => {
  return fileController.list(req, res);
});

// GET /api/files/:id - Get file details
fileRouter.get('/files/:id', authMiddleware, requireWorkspaceMember, (req, res) => {
  return fileController.getById(req, res);
});

// GET /api/files/:id/download - Secure download (Signed URL or direct stream)
fileRouter.get('/files/:id/download', authMiddleware, requireWorkspaceMember, (req, res) => {
  return fileController.download(req, res);
});

// DELETE /api/files/:id - Delete file
fileRouter.delete('/files/:id', authMiddleware, requireWorkspaceEditor, (req, res) => {
  return fileController.delete(req, res);
});
