/**
 * Document Ingestion & Registry Routes
 * Endpoints:
 * - GET  /api/documents
 * - POST /api/documents/upload
 * - GET  /api/documents/:id
 */

import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { documents } from '../services/dataStore.js';

export const documentRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// GET /api/documents
documentRouter.get('/documents', (req, res) => {
  res.json({
    success: true,
    data: env.DEMO_MODE ? documents : [],
    message: 'Documents retrieved',
    timestamp: new Date().toISOString()
  });
});

// POST /api/documents/upload (supports both multipart and json)
documentRouter.post('/documents/upload', upload.single('file'), (req, res) => {
  if (!env.DEMO_MODE) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'USE_FILES_API',
        message: 'In-memory upload disabled in production mode. Use /api/files with workspace authorization.'
      },
      timestamp: new Date().toISOString()
    });
  }
  let title = (req.body && (req.body.title || req.body.name)) || (req.file && req.file.originalname) || 'Document.pdf';
  let size = (req.body && req.body.size) || (req.file ? `${(req.file.size / (1024 * 1024)).toFixed(2)} MB` : '1.4 MB');
  let hash = (req.body && req.body.hash) || (req.file ? crypto.createHash('sha256').update(req.file.buffer).digest('hex') : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  const doc = {
    id: `DOC-${Date.now().toString().slice(-4)}`,
    name: title,
    title,
    fileName: title,
    source_hash: hash,
    sha256: hash,
    status: 'ANALYZED',
    storage_path: `/storage/documents/DOC-${Date.now().toString().slice(-4)}.pdf`,
    pages: req.body && req.body.pages ? Number(req.body.pages) : 14,
    size,
    uploaded_at: new Date().toISOString(),
    uploadedAt: new Date().toISOString()
  };

  documents.unshift(doc);

  res.status(201).json({
    success: true,
    data: doc,
    message: 'Document uploaded successfully',
    timestamp: new Date().toISOString()
  });
});

// GET /api/documents/:id
documentRouter.get('/documents/:id', (req, res) => {
  const doc = documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Document not found' },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: doc,
    timestamp: new Date().toISOString()
  });
});
