/**
 * Document Text Extraction & OCR Routes
 * Endpoints:
 * - POST /api/ocr                    -> Primary OCR endpoint: process file by ID
 * - GET  /api/ocr/:fileId            -> Retrieve stored OCR result
 * - POST /api/files/:id/extract-text -> Alias for stored file processing
 * - GET  /api/files/:id/ocr          -> Alias for stored OCR result
 * - POST /api/ocr/extract            -> Direct file extraction via multipart upload
 */

import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { ocrController } from '../controllers/ocr.controller.js';
import { ocrService } from '../services/ocr/ocr.service.js';
import { MAX_FILE_SIZE } from '../services/files/storage.service.js';

export const ocrRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// POST /api/ocr - Primary Step 6 OCR processing endpoint
ocrRouter.post('/ocr', authMiddleware, (req, res) => {
  return ocrController.processFile(req, res);
});

// GET /api/ocr/:fileId - Retrieve saved extraction record
ocrRouter.get('/ocr/:fileId', authMiddleware, (req, res) => {
  return ocrController.getOcrResult(req, res);
});

// POST /api/files/:id/extract-text - Alias for existing stored file extraction
ocrRouter.post('/files/:id/extract-text', authMiddleware, (req, res) => {
  req.body = req.body || {};
  req.body.fileId = req.params.id;
  return ocrController.processFile(req, res);
});

// GET /api/files/:id/ocr - Retrieve saved extraction record
ocrRouter.get('/files/:id/ocr', authMiddleware, (req, res) => {
  return ocrController.getOcrResult(req, res);
});

// POST /api/ocr/extract - Direct multipart upload extraction (for developer/pipeline tools)
ocrRouter.post('/ocr/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'File is required in multipart upload.' },
        timestamp: new Date().toISOString()
      });
    }

    const result = await ocrService.extractText({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      id: `direct-${Date.now()}`
    });

    return res.json({
      success: true,
      data: result,
      message: 'Document processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'EXTRACTION_FAILED', message: err.message },
      timestamp: new Date().toISOString()
    });
  }
});
