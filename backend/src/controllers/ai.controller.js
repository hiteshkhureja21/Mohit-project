/**
 * AI Controller
 * STEP 7: Official OpenAI Integration for SourceFlow
 * 
 * Endpoints:
 * - POST /api/ai/summarize  -> Executive summary and key action items
 * - POST /api/ai/analyze    -> Full institutional structured analysis
 * - POST /api/ai/extract    -> Discrete factual claims and dates
 * - POST /api/ai/generate   -> Audience-tailored communication deliverables
 * - GET  /api/ai/requests   -> Audit log of AI queries
 */

import { tryDirectExtraction } from '../services/ocr/directExtractor.js';
import { promptService } from '../services/ai/prompt.service.js';
import { openaiService } from '../services/ai/openai.service.js';
import { storageService } from '../services/files/storage.service.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AiController {
  /**
   * Helper: Resolves and validates caller authorization, workspace isolation,
   * and retrieves normalized document text from OCR results or direct extraction.
   */
  async _resolveAuthorizedDocumentText(req) {
    const fileId = req.body?.fileId || req.body?.file_id;
    if (!fileId || typeof fileId !== 'string') {
      const err = new Error('Field "fileId" is required in request body.');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    // 1. Authenticate user
    if (!req.user || !req.user.id) {
      const err = new Error('Authentication required.');
      err.code = 'AUTH_REQUIRED';
      err.statusCode = 401;
      throw err;
    }

    // 2. Verify file exists in database
    const file = await storageService.getFileById(fileId);
    if (!file) {
      const err = new Error(`File '${fileId}' not found.`);
      err.code = 'FILE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const workspaceId = file.workspace_id || file.workspaceId;
    if (!workspaceId) {
      const err = new Error('File is not associated with a valid workspace.');
      err.code = 'FILE_NOT_FOUND';
      err.statusCode = 400;
      throw err;
    }

    // 3. Workspace header verification (prevent cross-workspace access)
    const headerWorkspaceId = req.headers['x-workspace-id'] || req.workspaceId;
    if (headerWorkspaceId && headerWorkspaceId !== workspaceId) {
      const err = new Error(`Access denied. File belongs to another workspace.`);
      err.code = 'ACCESS_DENIED';
      err.statusCode = 403;
      throw err;
    }

    // 4. Verify workspace membership and role (owner or editor required)
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data: member, error: memberErr } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (memberErr || !member) {
        const err = new Error(`Access denied. You do not belong to workspace '${workspaceId}'.`);
        err.code = 'ACCESS_DENIED';
        err.statusCode = 403;
        throw err;
      }

      if (member.role === 'viewer') {
        const err = new Error("Insufficient workspace permissions. Required role: 'editor', your role: 'viewer'.");
        err.code = 'ACCESS_DENIED';
        err.statusCode = 403;
        throw err;
      }
    }

    // 5. Retrieve existing extracted text or OCR results
    let documentText = '';
    const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

    if (supabase) {
      const { data: ocrRow } = await supabase
        .from('ocr_results')
        .select('extracted_text')
        .eq('file_id', file.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ocrRow && ocrRow.extracted_text && ocrRow.extracted_text.trim().length > 0) {
        documentText = ocrRow.extracted_text.trim();
      }
    }

    // Fallback: If no OCR record exists, attempt direct extraction on digital PDF or text file
    if (!documentText) {
      try {
        const access = await storageService.getDownloadAccess(file.id, workspaceId);
        let buffer = access.buffer;

        if (!buffer && access.signedUrl) {
          const fetchRes = await fetch(access.signedUrl);
          if (fetchRes.ok) {
            buffer = Buffer.from(await fetchRes.arrayBuffer());
          }
        }

        if (buffer) {
          const direct = await tryDirectExtraction(buffer, file.original_name || file.name, file.mime_type);
          if (direct && direct.extractedText && direct.extractedText.trim().length > 0) {
            documentText = direct.extractedText.trim();
          }
        }
      } catch (storageErr) {
        logger.warn(`Storage text extraction fallback attempt failed: ${storageErr.message}`);
      }
    }

    if (!documentText || documentText.trim().length === 0) {
      const err = new Error(`Document text not found. Please extract text or run OCR (POST /api/ocr) before executing AI operations.`);
      err.code = 'DOCUMENT_TEXT_NOT_FOUND';
      err.statusCode = 400;
      throw err;
    }

    // 6. Enforce safe input-size limit (no RAG/chunking in Step 7)
    if (documentText.length > env.MAX_AI_INPUT_CHARS) {
      const err = new Error(`Document text exceeds maximum size limit of ${env.MAX_AI_INPUT_CHARS} characters for AI processing. Please provide a smaller document.`);
      err.code = 'DOCUMENT_TOO_LARGE';
      err.statusCode = 400;
      throw err;
    }

    return {
      file,
      workspaceId,
      documentText
    };
  }

  /**
   * Helper: Orchestrates AI request logging and OpenAI structured execution
   */
  async _executeAiOperation(operation, req, res, context = {}) {
    let aiRequestId = null;
    let supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

    try {
      const { file, workspaceId, documentText } = await this._resolveAuthorizedDocumentText(req);

      // 1. Log request with status: 'processing'
      if (supabase) {
        try {
          const { data: aiReq } = await supabase
            .from('ai_requests')
            .insert({
              user_id: req.user.id,
              workspace_id: workspaceId,
              file_id: file.id,
              operation,
              model: env.OPENAI_MODEL || 'gpt-4o-mini',
              input_text: documentText.slice(0, 2000), // Store safe sample
              status: 'processing',
              tokens_used: 0,
              metadata: {
                fileName: file.original_name,
                charLength: documentText.length,
                startedAt: new Date().toISOString()
              }
            })
            .select('id')
            .single();

          if (aiReq) aiRequestId = aiReq.id;
        } catch (dbErr) {
          logger.warn(`Failed to insert processing row into ai_requests: ${dbErr.message}`);
        }
      }

      // 2. Build defensive prompt with structured schema
      const promptPayload = promptService.buildPrompt(operation, documentText, context);

      // 3. Call OpenAI Structured Output Service
      const result = await openaiService.executeStructuredPrompt(
        promptPayload,
        {
          model: req.body?.model || env.OPENAI_MODEL,
          temperature: req.body?.temperature,
          timeoutMs: env.OPENAI_TIMEOUT_MS
        }
      );

      // 4. Update status: 'completed'
      if (supabase && aiRequestId) {
        try {
          await supabase
            .from('ai_requests')
            .update({
              status: 'completed',
              output_text: JSON.stringify(result.data),
              tokens_used: result.usage?.totalTokens || 0,
              metadata: {
                fileName: file.original_name,
                charLength: documentText.length,
                executionTimeMs: result.executionTimeMs,
                completedAt: new Date().toISOString()
              }
            })
            .eq('id', aiRequestId);
        } catch (updateErr) {
          logger.warn(`Failed to update completed row in ai_requests: ${updateErr.message}`);
        }
      }

      return res.json({
        success: true,
        data: result.data,
        requestId: aiRequestId,
        fileId: file.id,
        operation,
        model: result.model,
        tokensUsed: result.usage?.totalTokens || 0,
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      // 5. Update status: 'failed' if request was recorded
      if (supabase && aiRequestId) {
        try {
          await supabase
            .from('ai_requests')
            .update({
              status: 'failed',
              output_text: JSON.stringify({ error: err.message, code: err.code }),
              metadata: {
                error: err.message,
                errorCode: err.code,
                failedAt: new Date().toISOString()
              }
            })
            .eq('id', aiRequestId);
        } catch (failErr) {
          logger.warn(`Failed to update failed row in ai_requests: ${failErr.message}`);
        }
      }

      logger.error(`[AiController.${operation}] Error:`, {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode
      });

      return res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.code || 'AI_REQUEST_FAILED',
          message: err.message || 'AI request execution failed.'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/ai/summarize
   */
  async summarize(req, res) {
    return this._executeAiOperation('summarize', req, res);
  }

  /**
   * POST /api/ai/analyze
   */
  async analyze(req, res) {
    return this._executeAiOperation('analyze', req, res);
  }

  /**
   * POST /api/ai/extract
   */
  async extract(req, res) {
    return this._executeAiOperation('extract', req, res);
  }

  /**
   * POST /api/ai/generate
   */
  async generate(req, res) {
    const profiles = req.body?.profiles;
    return this._executeAiOperation('generate', req, res, { profiles });
  }

  /**
   * GET /api/ai/requests
   * Audit log of AI queries for authorized workspace
   */
  async getRequests(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' },
          timestamp: new Date().toISOString()
        });
      }

      const workspaceId = req.workspaceId || req.query.workspaceId;
      const fileId = req.query.fileId;

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        let query = supabase.from('ai_requests').select('*');
        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        if (fileId) query = query.eq('file_id', fileId);
        query = query.order('created_at', { ascending: false }).limit(50);

        const { data, error } = await query;
        if (error) throw error;
        return res.json({
          success: true,
          data: data || [],
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: [],
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: 'AI_REQUESTS_FETCH_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const aiController = new AiController();
export default aiController;
