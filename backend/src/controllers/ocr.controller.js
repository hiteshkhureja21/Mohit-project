/**
 * OCR Controller
 * STEP 6: OCR Integration with OCR.Space & Direct Text Extraction
 * 
 * Endpoints:
 * - POST /api/ocr             -> Process a workspace file (PDF / PNG / JPG / JPEG)
 * - GET  /api/ocr/:fileId     -> Retrieve stored OCR result for a file
 * - GET  /api/files/:id/ocr   -> Alias for stored OCR result
 */

import { ocrService } from '../services/ocr/ocr.service.js';
import { storageService } from '../services/files/storage.service.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';

const SUPPORTED_OCR_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
]);

const SUPPORTED_OCR_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg'
]);

export class OcrController {
  /**
   * POST /api/ocr
   * Request body: { fileId: string, language?: string }
   */
  async processFile(req, res) {
    const fileId = req.body?.fileId || req.body?.file_id;
    const language = req.body?.language || 'eng';

    // 1. Validate request payload
    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Field "fileId" is required in request body.' },
        timestamp: new Date().toISOString()
      });
    }

    // 2. Authenticate user (guaranteed by authMiddleware, but verify req.user)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required to process document.' },
        timestamp: new Date().toISOString()
      });
    }

    try {
      // 3. Verify file exists
      const file = await storageService.getFileById(fileId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: `File '${fileId}' not found.` },
          timestamp: new Date().toISOString()
        });
      }

      // 4. Verify workspace membership and role (owner or editor required)
      const workspaceId = file.workspace_id || file.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File is not associated with a valid workspace.' },
          timestamp: new Date().toISOString()
        });
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data: member, error: memberErr } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', req.user.id)
          .maybeSingle();

        if (memberErr || !member) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: `Access denied. You do not belong to workspace '${workspaceId}'.` },
            timestamp: new Date().toISOString()
          });
        }

        if (member.role === 'viewer') {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: "Insufficient workspace permissions. Required role: 'editor', your role: 'viewer'." },
            timestamp: new Date().toISOString()
          });
        }
      }

      // 5. Verify file type is supported for OCR (PDF, PNG, JPG, JPEG)
      const originalName = file.original_name || file.fileName || file.name || 'document';
      const mimeType = (file.mime_type || file.mimeType || '').toLowerCase();
      const ext = '.' + originalName.split('.').pop().toLowerCase();

      if (!SUPPORTED_OCR_EXTENSIONS.has(ext) && !SUPPORTED_OCR_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `Unsupported file type '${ext}' for OCR. OCR supports PDF, PNG, and JPG/JPEG files. Documents such as DOCX or XLSX should be processed via their dedicated pipelines.`
          },
          timestamp: new Date().toISOString()
        });
      }

      // 6. Retrieve private Storage object binary
      const access = await storageService.getDownloadAccess(fileId, workspaceId);
      let buffer = access.buffer;

      if (!buffer && access.signedUrl) {
        const fetchRes = await fetch(access.signedUrl);
        if (!fetchRes.ok) {
          throw new Error('Failed to retrieve file binary from private storage.');
        }
        buffer = Buffer.from(await fetchRes.arrayBuffer());
      }

      if (!buffer || buffer.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Could not access file content in storage for OCR processing.' },
          timestamp: new Date().toISOString()
        });
      }

      // 7. Transition file status to 'processing'
      await storageService.updateFileStatus(fileId, 'processing');

      // 8. Execute extraction / OCR
      let result;
      try {
        result = await ocrService.extractText({
          buffer,
          originalName,
          mimeType,
          id: fileId,
          workspaceId
        }, { language });
      } catch (ocrErr) {
        // Transition file status to 'failed'
        await storageService.updateFileStatus(fileId, 'failed');
        throw ocrErr;
      }

      // 9. Transition file status to 'completed'
      await storageService.updateFileStatus(fileId, 'completed');

      // 10. Return structured response
      return res.status(200).json({
        success: true,
        data: {
          id: result.id,
          fileId: fileId,
          provider: result.provider || 'ocr.space',
          status: 'completed',
          language: result.language || language,
          text: result.extractedText,
          metrics: result.metrics || {},
          createdAt: result.createdAt || new Date().toISOString()
        },
        message: 'OCR processing completed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('[OcrController.processFile] Error:', err);

      let statusCode = err.statusCode || 500;
      let errorCode = err.code || 'OCR_FAILED';

      if (errorCode === 'OCR_TIMEOUT') {
        statusCode = 504;
      } else if (errorCode === 'OCR_RATE_LIMIT') {
        statusCode = 429;
        errorCode = 'OCR_FAILED';
      } else if (errorCode === 'STORAGE_ERROR') {
        statusCode = 500;
      } else if (errorCode === 'INVALID_FILE_TYPE') {
        statusCode = 400;
      } else if (statusCode >= 500) {
        errorCode = 'OCR_FAILED';
      }

      return res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: err.message || 'OCR extraction failed on document.'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/ocr/:fileId or GET /api/files/:id/ocr
   */
  async getOcrResult(req, res) {
    const fileId = req.params.fileId || req.params.id;
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File ID is required.' },
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Verify file exists
      const file = await storageService.getFileById(fileId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found.' },
          timestamp: new Date().toISOString()
        });
      }

      // Verify workspace membership
      const workspaceId = file.workspace_id || file.workspaceId;
      if (isSupabaseConfigured() && workspaceId) {
        const supabase = getSupabaseClient();
        const { data: member } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', req.user.id)
          .maybeSingle();

        if (!member) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied. You do not belong to this workspace.' },
            timestamp: new Date().toISOString()
          });
        }
      }

      const result = await ocrService.getOcrResultByFileId(fileId);
      if (!result) {
        return res.status(404).json({
          success: false,
          error: { code: 'OCR_NOT_FOUND', message: 'No OCR extraction record found for this file.' },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: result.id,
          fileId: result.file_id || fileId,
          provider: result.provider || 'ocr.space',
          status: result.status || 'completed',
          language: result.language || 'eng',
          text: result.extracted_text || '',
          confidence: result.confidence,
          metadata: result.metadata || {},
          createdAt: result.created_at
        },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[OcrController.getOcrResult] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'OCR_FETCH_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const ocrController = new OcrController();
