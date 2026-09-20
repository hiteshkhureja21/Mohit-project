/**
 * File Controller
 * Handles HTTP requests for file upload, retrieval, signed URL download, and deletion.
 */

import { storageService, validateFileMetadata } from '../services/files/storage.service.js';

export class FileController {
  /**
   * POST /api/files (or /api/files/upload)
   */
  async upload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file was provided in multipart/form-data.' },
          timestamp: new Date().toISOString()
        });
      }

      const originalName = req.file.originalname;
      const mimeType = req.file.mimetype;
      const fileBuffer = req.file.buffer;

      // Validate before upload
      const validation = validateFileMetadata(originalName, mimeType, fileBuffer.length);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: { code: validation.code, message: validation.message },
          timestamp: new Date().toISOString()
        });
      }

      const fileRecord = await storageService.uploadFile({
        workspaceId: req.workspaceId,
        fileBuffer,
        originalName,
        mimeType,
        uploadedBy: req.user.id
      });

      return res.status(201).json({
        success: true,
        data: fileRecord,
        message: 'File successfully uploaded and stored',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[FileController.upload] Error:', err);
      const status = err.statusCode || 500;
      return res.status(status).json({
        success: false,
        error: { code: err.code || 'UPLOAD_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/files
   */
  async list(req, res) {
    try {
      const files = await storageService.listFiles(req.workspaceId);
      return res.json({
        success: true,
        data: files,
        message: 'Workspace files retrieved',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'LIST_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/files/:id
   */
  async getById(req, res) {
    try {
      const access = await storageService.getDownloadAccess(req.params.id, req.workspaceId);
      return res.json({
        success: true,
        data: access.file,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(err.statusCode || 404).json({
        success: false,
        error: { code: err.code || 'NOT_FOUND', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/files/:id/download
   */
  async download(req, res) {
    try {
      const access = await storageService.getDownloadAccess(req.params.id, req.workspaceId);

      // 1. Signed URL redirect (Supabase Storage)
      if (access.signedUrl) {
        if (req.query.json === 'true') {
          return res.json({
            success: true,
            data: { signedUrl: access.signedUrl },
            timestamp: new Date().toISOString()
          });
        }
        return res.redirect(access.signedUrl);
      }

      // 2. Binary buffer delivery (Disk / Stream)
      if (access.buffer) {
        res.setHeader('Content-Type', access.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(access.filename)}"`);
        res.setHeader('Content-Length', access.buffer.length);
        return res.send(access.buffer);
      }

      return res.status(500).json({
        success: false,
        error: { code: 'DOWNLOAD_FAILED', message: 'Unable to stream file content.' },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(err.statusCode || 404).json({
        success: false,
        error: { code: err.code || 'DOWNLOAD_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/files/:id
   */
  async delete(req, res) {
    try {
      const result = await storageService.deleteFile(req.params.id, req.workspaceId);
      return res.json({
        success: true,
        data: result,
        message: 'File deleted from storage and database',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'DELETE_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const fileController = new FileController();
